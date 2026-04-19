import type {
  CreateRoomRequest,
  ConfirmHeadphonesRequest,
  JoinRoomRequest,
  LeaveRoomRequest,
  PresentationModerationRequest,
  PresentationReleaseFloorRequest,
  PresentationRequestToSpeakRequest,
  ParticipantUpdateResponse,
  RealtimeCredentialsRequest,
  RealtimeCredentialsResponse,
  RoomRealtimeSessionResponse,
  RoomSessionResponse,
  RoomState,
  StartSessionRequest,
  StartSessionResponse,
  TranslatedVoiceRequest,
  TranslatedVoiceResponse,
  VoiceCloneResponse,
  VoiceCloneStatusResponse
} from "@translator/shared";
import { auth, isFirebaseEnabled } from "./firebase";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  let authToken: string | null = null;
  
  if (isFirebaseEnabled && auth) {
    try {
      authToken = await auth.currentUser?.getIdToken() ?? null;
    } catch (error) {
      console.error("Failed to get auth token:", error);
    }
  }

  const headers = new Headers({
    "Content-Type": "application/json"
  });

  if (init?.headers) {
    if (init.headers instanceof Headers) {
      for (const [key, value] of init.headers.entries()) {
        headers.set(key, value);
      }
    } else if (typeof init.headers === 'object') {
      for (const [key, value] of Object.entries(init.headers)) {
        headers.set(key, String(value));
      }
    }
  }

  if (authToken) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers
  });

  const data = await response.json();

  if (!response.ok) {
    const missingRequirements = data?.error?.details?.readiness?.missingRequirements;
    const requirementText = Array.isArray(missingRequirements) && missingRequirements.length > 0 ? ` Missing: ${missingRequirements.join(", ")}.` : "";
    const realtimeError = data?.error?.details?.realtimeSession?.errorMessage;
    const realtimeText = typeof realtimeError === "string" ? ` ${realtimeError}` : "";
    const detailReason = data?.error?.details?.reason;
    const reasonText = typeof detailReason === "string" ? ` ${detailReason}` : "";

    throw new Error(`${data?.error?.message ?? "Request failed"}.${requirementText}${realtimeText}${reasonText}`);
  }

  return data as T;
};

export const createRoom = (input: CreateRoomRequest) =>
  request<RoomSessionResponse>("/api/rooms/create", {
    method: "POST",
    body: JSON.stringify(input)
  });

export const joinRoom = (input: JoinRoomRequest) =>
  request<RoomSessionResponse>("/api/rooms/join", {
    method: "POST",
    body: JSON.stringify(input)
  });

export const leaveRoom = (input: LeaveRoomRequest) =>
  request<RoomState>("/api/rooms/leave", {
    method: "POST",
    body: JSON.stringify(input)
  });

export const getRoom = (roomId: string) => request<RoomState>(`/api/rooms/${roomId}`);

export const confirmHeadphones = (participantId: string, input: ConfirmHeadphonesRequest) =>
  request<ParticipantUpdateResponse>(`/api/participants/${participantId}/headphones`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });

export const startSession = (roomId: string, input: StartSessionRequest) =>
  request<StartSessionResponse>(`/api/rooms/${roomId}/start`, {
    method: "POST",
    body: JSON.stringify(input)
  });

export const requestToSpeak = (roomId: string, input: PresentationRequestToSpeakRequest) =>
  request<{
    roomState: RoomState;
  }>(`/api/rooms/${roomId}/presentation/request-to-speak`, {
    method: "POST",
    body: JSON.stringify(input)
  });

export const approveSpeakRequest = (roomId: string, input: PresentationModerationRequest) =>
  request<{
    roomState: RoomState;
  }>(`/api/rooms/${roomId}/presentation/approve-request`, {
    method: "POST",
    body: JSON.stringify(input)
  });

export const denySpeakRequest = (roomId: string, input: PresentationModerationRequest) =>
  request<{
    roomState: RoomState;
  }>(`/api/rooms/${roomId}/presentation/deny-request`, {
    method: "POST",
    body: JSON.stringify(input)
  });

export const releasePresentationFloor = (roomId: string, input: PresentationReleaseFloorRequest) =>
  request<{
    roomState: RoomState;
  }>(`/api/rooms/${roomId}/presentation/release-floor`, {
    method: "POST",
    body: JSON.stringify(input)
  });

export const getRoomRealtimeSession = (roomId: string) => request<RoomRealtimeSessionResponse>(`/api/rooms/${roomId}/session`);

export const getRealtimeCredentials = (roomId: string, input: RealtimeCredentialsRequest) =>
  request<RealtimeCredentialsResponse>(`/api/rooms/${roomId}/realtime-credentials`, {
    method: "POST",
    body: JSON.stringify(input)
  });

export const startVoiceClone = (participantId: string) =>
  request<VoiceCloneResponse>(`/api/voices/${participantId}/clone`, {
    method: "POST",
    body: JSON.stringify({})
  });

export const createProfileClone = (input: { userId: string; userName: string; voiceSampleUrl: string; durationSeconds?: number }) =>
  request<{ providerVoiceId: string; provider: string; requiresVerification: boolean }>("/api/voices/create-profile-clone", {
    method: "POST",
    body: JSON.stringify(input)
  });

export const assignProfileClone = (participantId: string, input: { providerVoiceId: string; provider: string }) =>
  request<VoiceCloneResponse>(`/api/voices/${participantId}/assign-clone`, {
    method: "POST",
    body: JSON.stringify(input)
  });

export const getVoiceCloneStatus = (participantId: string) => request<VoiceCloneStatusResponse>(`/api/voices/${participantId}/clone-status`);

export const synthesizeTranslatedVoice = (input: TranslatedVoiceRequest) =>
  request<TranslatedVoiceResponse>("/api/voices/tts", {
    method: "POST",
    body: JSON.stringify(input)
  });
