import type { Participant, RoomReadiness, RoomState, SpeakRequest } from "./room";

export interface RoomJoinSocketPayload {
  roomId: string;
  participantId: string;
}

export interface RoomLeaveSocketPayload {
  roomId: string;
  participantId: string;
}

export interface ConfirmHeadphonesSocketPayload {
  roomId: string;
  participantId: string;
  confirmed?: boolean;
}

export interface SessionStartSocketPayload {
  roomId: string;
  participantId: string;
}

export interface PresentationRequestToSpeakSocketPayload {
  roomId: string;
  participantId: string;
}

export interface PresentationModerationSocketPayload {
  roomId: string;
  hostParticipantId: string;
  participantId: string;
}

export interface PresentationReleaseFloorSocketPayload {
  roomId: string;
  participantId: string;
}

export interface PresentationSpeakerTurnSocketPayload {
  roomId: string;
  participantId: string;
  transcriptText: string;
}

export interface RoomJoinedSocketPayload {
  roomState: RoomState;
  participant: Participant;
}

export interface ParticipantChangedSocketPayload {
  roomId: string;
  participant: Participant;
  roomState?: RoomState;
}

export interface RoomReadinessUpdatedSocketPayload {
  roomId: string;
  readiness: RoomReadiness;
  roomState: RoomState;
}

export interface SessionStartedSocketPayload {
  roomId: string;
  roomState: RoomState;
}

export interface SessionStartFailedSocketPayload {
  roomId: string;
  message: string;
  readiness?: RoomReadiness;
}

export interface SocketErrorPayload {
  message: string;
  code?: string;
}

export interface PresentationActiveSpeakerUpdatedSocketPayload {
  roomId: string;
  activeSpeakerParticipantId: string | null;
  roomState: RoomState;
}

export interface PresentationSpeakRequestedSocketPayload {
  roomId: string;
  request: SpeakRequest;
  roomState: RoomState;
}

export interface PresentationSpeakRequestResolvedSocketPayload {
  roomId: string;
  participantId: string;
  roomState: RoomState;
}

export interface PresentationTranslationDelivery {
  id: string;
  roomId: string;
  speakerParticipantId: string;
  listenerParticipantId: string;
  sourceLanguage: string;
  targetLanguage: string;
  sourceText: string;
  translatedText: string;
  createdAt: string;
}

export interface PresentationTranslationsDeliveredSocketPayload {
  roomId: string;
  speakerParticipantId: string;
  deliveries: PresentationTranslationDelivery[];
}

export interface ConversationTranslationSubmittedSocketPayload {
  roomId: string;
  speakerParticipantId: string;
  translatedText: string;
}

export interface ConversationTranslationDeliveredSocketPayload {
  roomId: string;
  speakerParticipantId: string;
  translatedText: string;
}

export interface ClientToServerEvents {
  "room:join": (payload: RoomJoinSocketPayload) => void;
  "room:leave": (payload: RoomLeaveSocketPayload) => void;
  "participant:confirm-headphones": (payload: ConfirmHeadphonesSocketPayload) => void;
  "session:start": (payload: SessionStartSocketPayload) => void;
  "presentation:request-to-speak": (payload: PresentationRequestToSpeakSocketPayload) => void;
  "presentation:approve-request": (payload: PresentationModerationSocketPayload) => void;
  "presentation:deny-request": (payload: PresentationModerationSocketPayload) => void;
  "presentation:release-floor": (payload: PresentationReleaseFloorSocketPayload) => void;
  "presentation:speaker-turn-submitted": (payload: PresentationSpeakerTurnSocketPayload) => void;
  "conversation:translation-submitted": (payload: ConversationTranslationSubmittedSocketPayload) => void;
}

export interface ServerToClientEvents {
  "room:joined": (payload: RoomJoinedSocketPayload) => void;
  "room:updated": (payload: RoomState) => void;
  "participant:joined": (payload: ParticipantChangedSocketPayload) => void;
  "participant:left": (payload: ParticipantChangedSocketPayload) => void;
  "participant:updated": (payload: ParticipantChangedSocketPayload) => void;
  "room:readiness-updated": (payload: RoomReadinessUpdatedSocketPayload) => void;
  "session:started": (payload: SessionStartedSocketPayload) => void;
  "session:start-failed": (payload: SessionStartFailedSocketPayload) => void;
  "presentation:active-speaker-updated": (payload: PresentationActiveSpeakerUpdatedSocketPayload) => void;
  "presentation:speak-requested": (payload: PresentationSpeakRequestedSocketPayload) => void;
  "presentation:speak-request-approved": (payload: PresentationSpeakRequestResolvedSocketPayload) => void;
  "presentation:speak-request-denied": (payload: PresentationSpeakRequestResolvedSocketPayload) => void;
  "presentation:translations-delivered": (payload: PresentationTranslationsDeliveredSocketPayload) => void;
  "conversation:translation-delivered": (payload: ConversationTranslationDeliveredSocketPayload) => void;
  "error": (payload: SocketErrorPayload) => void;
}
