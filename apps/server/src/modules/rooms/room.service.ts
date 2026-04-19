import { randomUUID } from "node:crypto";
import {
  CONVERSATION_MAX_PARTICIPANTS,
  DEFAULT_ROOM_MODE,
  PRESENTATION_MAX_PARTICIPANTS,
  type CreateRoomRequest,
  type JoinRoomRequest,
  type LeaveRoomRequest,
  type Participant,
  type ParticipantUpdateResponse,
  type PresentationTranslationDelivery,
  type RealtimeConnectionCredentials,
  type RealtimeCredentialsResponse,
  type RealtimeSessionMetadata,
  type Room,
  type RoomMode,
  type RoomRealtimeSessionResponse,
  type RoomSessionResponse,
  type RoomState,
  type SpeakRequest,
  type StartSessionResponse,
  type VoiceProfileStatus
} from "@translator/shared";
import { createParticipant } from "../participants/participant.factory";
import { getAllRoomRecords, getRoomRecord, getRoomRecordByCode, isRoomCodeTaken, saveRoomRecord } from "./room.store";
import type { RoomRecord } from "./room.store";
import { evaluateRoomReadiness } from "./room.readiness";
import { bootstrapRealtimeSession, OPENAI_REALTIME_CALLS_URL } from "../../integrations/openai/realtime.client";
import type { RealtimeBootstrapResult } from "../../integrations/openai/realtime.types";
import { HttpError } from "../../utils/httpError";
import { generateRoomCode } from "../../utils/roomCode";
import { translatePresentationTurn } from "./presentation.translation";

interface LeaveRoomResult {
  roomId: string;
  participant: Participant;
  roomState: RoomState;
}

interface StoredRealtimeCredentials {
  clientSecret: string;
  expiresAt: string | null;
  issuedAt: string;
  metadataId: string;
}

interface PresentationRequestToSpeakResult {
  roomState: RoomState;
  request: SpeakRequest;
}

interface PresentationModerationResult {
  roomState: RoomState;
  participantId: string;
  activeSpeakerParticipantId: string | null;
}

interface PresentationTurnRoutingResult {
  roomState: RoomState;
  deliveries: PresentationTranslationDelivery[];
}

const realtimeCredentialsByRoomId = new Map<string, StoredRealtimeCredentials>();

const resolveMaxParticipants = (mode: RoomMode) =>
  mode === "presentation" ? PRESENTATION_MAX_PARTICIPANTS : CONVERSATION_MAX_PARTICIPANTS;

const isPresentationRoom = (record: RoomRecord) => record.room.mode === "presentation";

const getExistingRoomRecord = (roomId: string) => {
  const record = getRoomRecord(roomId);

  if (!record) {
    throw new HttpError(404, "Room not found");
  }

  return record;
};

const getExistingParticipant = (record: RoomRecord, participantId: string) => {
  const participant = record.participants.get(participantId);

  if (!participant) {
    throw new HttpError(404, "Participant not found in room");
  }

  return participant;
};

const refreshRoomStatus = (record: RoomRecord) => {
  const count = record.participants.size;

  if (count === 0) {
    record.room.status = "closed";
    return;
  }

  if (record.room.status === "active") {
    return;
  }

  const readiness = evaluateRoomReadiness(record);

  if (count < Math.min(record.room.maxParticipants, 2)) {
    record.room.status = "waiting";
    return;
  }

  record.room.status = readiness.ready ? "ready" : "almost_ready";
};

const toRoomState = (record: RoomRecord): RoomState => {
  refreshRoomStatus(record);

  return {
    room: record.room,
    participants: Array.from(record.participants.values()),
    readiness: evaluateRoomReadiness(record)
  };
};

const createUniqueRoomCode = () => {
  let code = generateRoomCode();

  while (isRoomCodeTaken(code)) {
    code = generateRoomCode();
  }

  return code;
};

const assertPresentationRoom = (record: RoomRecord) => {
  if (!isPresentationRoom(record)) {
    throw new HttpError(409, "This action is only available in presentation mode");
  }
};

const assertHostPermission = (record: RoomRecord, participantId: string) => {
  if (record.room.hostParticipantId !== participantId) {
    throw new HttpError(403, "Only the host can perform this action");
  }
};

const removePendingSpeakRequest = (record: RoomRecord, participantId: string) => {
  const beforeCount = record.room.pendingSpeakRequests.length;
  record.room.pendingSpeakRequests = record.room.pendingSpeakRequests.filter((request) => request.participantId !== participantId);
  return record.room.pendingSpeakRequests.length < beforeCount;
};

const toPresentationRole = (record: RoomRecord, participant: Participant) => {
  if (participant.id === record.room.hostParticipantId) {
    return "host" as const;
  }

  if (participant.id === record.room.activeSpeakerParticipantId) {
    return "speaker" as const;
  }

  return "listener" as const;
};

const syncPresentationRoles = (record: RoomRecord) => {
  if (!isPresentationRoom(record)) {
    return;
  }

  for (const participant of record.participants.values()) {
    participant.role = toPresentationRole(record, participant);
  }
};

const setPresentationActiveSpeaker = (record: RoomRecord, participantId: string | null) => {
  if (!isPresentationRoom(record)) {
    return;
  }

  if (participantId && !record.participants.has(participantId)) {
    throw new HttpError(404, "Participant not found in room");
  }

  record.room.activeSpeakerParticipantId = participantId;
  if (participantId) {
    removePendingSpeakRequest(record, participantId);
  }
  syncPresentationRoles(record);
};

const chooseFallbackActiveSpeaker = (record: RoomRecord): string | null => {
  const pendingCandidate = record.room.pendingSpeakRequests.find((request) => record.participants.has(request.participantId));

  if (pendingCandidate) {
    return pendingCandidate.participantId;
  }

  if (record.room.hostParticipantId && record.participants.has(record.room.hostParticipantId)) {
    return record.room.hostParticipantId;
  }

  const firstParticipant = Array.from(record.participants.values())[0];
  return firstParticipant?.id ?? null;
};

const markRealtimeBootstrapFailed = (record: RoomRecord, message: string): RealtimeSessionMetadata => {
  const now = new Date().toISOString();

  return {
    id: `failed_${record.room.id}`,
    provider: "openai",
    status: "failed",
    createdAt: now,
    expiresAt: null,
    connectionStatus: "failed",
    connectionMode: "webrtc",
    mode: "realtime",
    roomId: record.room.id,
    model: "unknown",
    bootstrapMode: "live",
    clientSecretExpiresAt: null,
    errorMessage: message
  };
};

const storeRealtimeCredentials = (roomId: string, bootstrap: RealtimeBootstrapResult) => {
  if (!bootstrap.clientSecret) {
    return;
  }

  realtimeCredentialsByRoomId.set(roomId, {
    clientSecret: bootstrap.clientSecret,
    expiresAt: bootstrap.metadata.clientSecretExpiresAt,
    issuedAt: new Date().toISOString(),
    metadataId: bootstrap.metadata.id
  });
};

const credentialsNeedRefresh = (credentials: StoredRealtimeCredentials | undefined) => {
  if (!credentials) {
    return true;
  }

  if (!credentials.expiresAt) {
    return false;
  }

  return new Date(credentials.expiresAt).getTime() - Date.now() < 30_000;
};

const toConnectionCredentials = (
  metadata: RealtimeSessionMetadata,
  credentials: StoredRealtimeCredentials
): RealtimeConnectionCredentials => ({
  clientSecret: credentials.clientSecret,
  realtimeUrl: metadata.bootstrapMode === "live" ? OPENAI_REALTIME_CALLS_URL : null,
  issuedAt: credentials.issuedAt,
  expiresAt: credentials.expiresAt,
  bootstrapMode: metadata.bootstrapMode,
  provider: metadata.provider,
  model: metadata.model
});

export const createRoom = (input: CreateRoomRequest, userId?: string): RoomSessionResponse => {
  const roomId = randomUUID();
  const code = createUniqueRoomCode();
  const mode = input.mode ?? DEFAULT_ROOM_MODE;

  const participant = createParticipant({
    roomId,
    name: input.name,
    role: mode === "presentation" ? "host" : "host",
    nativeLanguage: input.nativeLanguage,
    targetLanguage: input.targetLanguage
  });

  const room: Room = {
    id: roomId,
    code,
    mode,
    hostParticipantId: participant.id,
    activeSpeakerParticipantId: mode === "presentation" ? participant.id : null,
    pendingSpeakRequests: [],
    maxParticipants: resolveMaxParticipants(mode),
    status: "waiting",
    createdAt: new Date().toISOString(),
    realtimeSession: null,
    createdByUserId: userId || undefined
  };

  const record: RoomRecord = {
    room,
    participants: new Map([[participant.id, participant]])
  };

  if (mode === "presentation") {
    syncPresentationRoles(record);
  }

  saveRoomRecord(record);

  return {
    roomState: toRoomState(record),
    participant
  };
};

export const joinRoom = (input: JoinRoomRequest, userId?: string): RoomSessionResponse => {
  const record = getRoomRecordByCode(input.code);

  if (!record) {
    throw new HttpError(404, "Room not found");
  }

  if (record.room.status === "closed") {
    throw new HttpError(409, "Room is closed");
  }

  if (record.participants.size >= record.room.maxParticipants) {
    throw new HttpError(409, "Room is full");
  }

  const participant = createParticipant({
    roomId: record.room.id,
    name: input.name,
    role: record.room.mode === "presentation" ? "listener" : "peer",
    nativeLanguage: input.nativeLanguage,
    targetLanguage: input.targetLanguage
  });

  record.participants.set(participant.id, participant);

  if (record.room.mode === "presentation") {
    syncPresentationRoles(record);
  }

  refreshRoomStatus(record);

  return {
    roomState: toRoomState(record),
    participant
  };
};

export const getRoomState = (roomId: string): RoomState => toRoomState(getExistingRoomRecord(roomId));

export const getParticipantInRoom = (roomId: string, participantId: string): Participant => {
  const record = getExistingRoomRecord(roomId);
  return getExistingParticipant(record, participantId);
};

export const getParticipantById = (participantId: string): Participant => {
  for (const record of getAllRoomRecords()) {
    const participant = record.participants.get(participantId);

    if (participant) {
      return participant;
    }
  }

  throw new HttpError(404, "Participant not found");
};

export const markParticipantVoiceProfile = (
  roomId: string,
  participantId: string,
  voiceProfileId: string,
  status: VoiceProfileStatus
): RoomState => {
  const record = getExistingRoomRecord(roomId);
  const participant = getExistingParticipant(record, participantId);

  participant.voiceProfileId = voiceProfileId;
  participant.voiceProfileStatus = status;

  return toRoomState(record);
};

export const confirmParticipantHeadphones = (roomId: string, participantId: string, confirmed = true): ParticipantUpdateResponse => {
  const record = getExistingRoomRecord(roomId);
  const participant = getExistingParticipant(record, participantId);

  participant.headphoneConfirmed = confirmed;

  return {
    participant,
    roomState: toRoomState(record)
  };
};

export const getRoomRealtimeSession = (roomId: string): RoomRealtimeSessionResponse => {
  const record = getExistingRoomRecord(roomId);

  return {
    roomState: toRoomState(record),
    realtimeSession: record.room.realtimeSession
  };
};

export const requestPresentationSpeak = (roomId: string, participantId: string): PresentationRequestToSpeakResult => {
  const record = getExistingRoomRecord(roomId);
  assertPresentationRoom(record);
  getExistingParticipant(record, participantId);

  if (record.room.activeSpeakerParticipantId === participantId) {
    throw new HttpError(409, "You already have the floor");
  }

  const existingRequest = record.room.pendingSpeakRequests.find((request) => request.participantId === participantId);

  if (existingRequest) {
    return {
      roomState: toRoomState(record),
      request: existingRequest
    };
  }

  const request: SpeakRequest = {
    participantId,
    requestedAt: new Date().toISOString()
  };

  record.room.pendingSpeakRequests.push(request);

  return {
    roomState: toRoomState(record),
    request
  };
};

export const approvePresentationSpeakRequest = (
  roomId: string,
  hostParticipantId: string,
  participantId: string
): PresentationModerationResult => {
  const record = getExistingRoomRecord(roomId);
  assertPresentationRoom(record);
  assertHostPermission(record, hostParticipantId);
  getExistingParticipant(record, participantId);

  const removed = removePendingSpeakRequest(record, participantId);

  if (!removed) {
    throw new HttpError(404, "Speak request not found");
  }

  setPresentationActiveSpeaker(record, participantId);

  return {
    roomState: toRoomState(record),
    participantId,
    activeSpeakerParticipantId: record.room.activeSpeakerParticipantId
  };
};

export const denyPresentationSpeakRequest = (
  roomId: string,
  hostParticipantId: string,
  participantId: string
): PresentationModerationResult => {
  const record = getExistingRoomRecord(roomId);
  assertPresentationRoom(record);
  assertHostPermission(record, hostParticipantId);
  getExistingParticipant(record, participantId);

  const removed = removePendingSpeakRequest(record, participantId);

  if (!removed) {
    throw new HttpError(404, "Speak request not found");
  }

  return {
    roomState: toRoomState(record),
    participantId,
    activeSpeakerParticipantId: record.room.activeSpeakerParticipantId
  };
};

export const releasePresentationFloor = (roomId: string, participantId: string): PresentationModerationResult => {
  const record = getExistingRoomRecord(roomId);
  assertPresentationRoom(record);
  getExistingParticipant(record, participantId);

  const isHost = record.room.hostParticipantId === participantId;
  const isActiveSpeaker = record.room.activeSpeakerParticipantId === participantId;

  if (!isHost && !isActiveSpeaker) {
    throw new HttpError(403, "Only the active speaker or host can release the floor");
  }

  const nextSpeakerId = chooseFallbackActiveSpeaker(record);
  setPresentationActiveSpeaker(record, nextSpeakerId);

  return {
    roomState: toRoomState(record),
    participantId,
    activeSpeakerParticipantId: record.room.activeSpeakerParticipantId
  };
};

export const routePresentationTurn = async (
  roomId: string,
  speakerParticipantId: string,
  transcriptText: string
): Promise<PresentationTurnRoutingResult> => {
  const record = getExistingRoomRecord(roomId);
  assertPresentationRoom(record);

  const normalizedTranscript = transcriptText.trim();
  if (!normalizedTranscript) {
    throw new HttpError(400, "transcriptText is required");
  }

  if (record.room.status !== "active") {
    throw new HttpError(409, "Presentation session is not active");
  }

  if (record.room.activeSpeakerParticipantId !== speakerParticipantId) {
    throw new HttpError(403, "Only the active speaker can submit a turn");
  }

  const speaker = getExistingParticipant(record, speakerParticipantId);
  const listeners = Array.from(record.participants.values()).filter((participant) => participant.id !== speakerParticipantId);

  const deliveries = await Promise.all(
    listeners.map(async (listener) => {
      const translatedText = await translatePresentationTurn({
        sourceText: normalizedTranscript,
        sourceLanguage: speaker.nativeLanguage,
        targetLanguage: listener.targetLanguage
      });

      return {
        id: randomUUID(),
        roomId,
        speakerParticipantId,
        listenerParticipantId: listener.id,
        sourceLanguage: speaker.nativeLanguage,
        targetLanguage: listener.targetLanguage,
        sourceText: normalizedTranscript,
        translatedText,
        createdAt: new Date().toISOString()
      } satisfies PresentationTranslationDelivery;
    })
  );

  return {
    roomState: toRoomState(record),
    deliveries
  };
};

export const getRealtimeConnectionCredentials = async (roomId: string, participantId: string): Promise<RealtimeCredentialsResponse> => {
  const record = getExistingRoomRecord(roomId);
  getExistingParticipant(record, participantId);

  if (record.room.mode === "presentation" && record.room.activeSpeakerParticipantId !== participantId) {
    throw new HttpError(403, "Only the active speaker can connect realtime audio in presentation mode");
  }

  if (record.room.status !== "active" || record.room.realtimeSession?.status !== "bootstrapped") {
    throw new HttpError(409, "Realtime session is not active yet");
  }

  let realtimeSession = record.room.realtimeSession;
  let credentials = realtimeCredentialsByRoomId.get(roomId);

  if (credentials?.metadataId !== realtimeSession.id) {
    credentials = undefined;
  }

  if (credentialsNeedRefresh(credentials)) {
    try {
      const bootstrap = await bootstrapRealtimeSession({
        roomId,
        roomMode: record.room.mode,
        activeSpeakerParticipantId: record.room.activeSpeakerParticipantId,
        participants: Array.from(record.participants.values())
      });
      realtimeSession = bootstrap.metadata;
      record.room.realtimeSession = realtimeSession;
      storeRealtimeCredentials(roomId, bootstrap);
      credentials = realtimeCredentialsByRoomId.get(roomId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "OpenAI Realtime credentials refresh failed";
      const failedSession = markRealtimeBootstrapFailed(record, message);
      record.room.realtimeSession = failedSession;

      throw new HttpError(502, "OpenAI Realtime credentials refresh failed", {
        realtimeSession: failedSession
      });
    }
  }

  if (!credentials) {
    throw new HttpError(502, "Realtime credentials are unavailable");
  }

  return {
    roomState: toRoomState(record),
    realtimeSession,
    credentials: toConnectionCredentials(realtimeSession, credentials)
  };
};

export const startRoomSession = async (roomId: string, participantId: string): Promise<StartSessionResponse> => {
  const record = getExistingRoomRecord(roomId);
  getExistingParticipant(record, participantId);

  if (record.room.hostParticipantId !== participantId) {
    throw new HttpError(403, "Only the host can start the session");
  }

  const roomState = toRoomState(record);

  if (!roomState.readiness.ready) {
    throw new HttpError(409, "Room is not ready to start", {
      readiness: roomState.readiness
    });
  }

  if (record.room.status === "active" && record.room.realtimeSession?.status === "bootstrapped") {
    return {
      roomState,
      started: true,
      realtimeSession: record.room.realtimeSession
    };
  }

  let realtimeSession: RealtimeSessionMetadata;

  try {
    const bootstrap = await bootstrapRealtimeSession({
      roomId,
      roomMode: record.room.mode,
      activeSpeakerParticipantId: record.room.activeSpeakerParticipantId,
      participants: Array.from(record.participants.values())
    });
    realtimeSession = bootstrap.metadata;
    storeRealtimeCredentials(roomId, bootstrap);
  } catch (error) {
    const message = error instanceof Error ? error.message : "OpenAI Realtime bootstrap failed";
    const failedSession = markRealtimeBootstrapFailed(record, message);
    record.room.realtimeSession = failedSession;

    throw new HttpError(502, "OpenAI Realtime session bootstrap failed", {
      realtimeSession: failedSession
    });
  }

  record.room.realtimeSession = realtimeSession;
  record.room.status = "active";

  return {
    roomState: toRoomState(record),
    started: true,
    realtimeSession
  };
};

export const connectParticipantSocket = (roomId: string, participantId: string, socketId: string): RoomSessionResponse & { isFirstConnection: boolean } => {
  const record = getExistingRoomRecord(roomId);
  const participant = getExistingParticipant(record, participantId);

  const isFirstConnection = participant.connectionStatus !== "online";
  participant.socketId = socketId;
  participant.connectionStatus = "online";

  return {
    roomState: toRoomState(record),
    participant,
    isFirstConnection
  };
};

export const disconnectParticipantSocket = (socketId: string): RoomState | null => {
  for (const record of getAllRoomRecords()) {
    const participant = Array.from(record.participants.values()).find((item) => item.socketId === socketId);

    if (!participant) {
      continue;
    }

    participant.socketId = null;
    participant.connectionStatus = "offline";
    refreshRoomStatus(record);

    return toRoomState(record);
  }

  return null;
};

export const leaveRoom = (input: LeaveRoomRequest): LeaveRoomResult => {
  const record = getExistingRoomRecord(input.roomId);
  const participant = getExistingParticipant(record, input.participantId);

  record.participants.delete(input.participantId);
  removePendingSpeakRequest(record, input.participantId);

  if (record.participants.size === 0) {
    realtimeCredentialsByRoomId.delete(record.room.id);
    record.room.activeSpeakerParticipantId = null;
    record.room.pendingSpeakRequests = [];
  }

  if (record.room.hostParticipantId === input.participantId) {
    const nextHost = Array.from(record.participants.values())[0];
    record.room.hostParticipantId = nextHost?.id ?? "";

    if (nextHost) {
      nextHost.role = "host";
    }
  }

  if (isPresentationRoom(record)) {
    const activeSpeakerLeft = record.room.activeSpeakerParticipantId === input.participantId;

    if (activeSpeakerLeft) {
      setPresentationActiveSpeaker(record, chooseFallbackActiveSpeaker(record));
    } else {
      syncPresentationRoles(record);
    }
  }

  refreshRoomStatus(record);

  return {
    roomId: record.room.id,
    participant,
    roomState: toRoomState(record)
  };
};
