import type { Participant, RoomMode, RoomReadiness, RoomState } from "./room";
import type { RealtimeConnectionCredentials, RealtimeSessionMetadata } from "./realtime";
import type { VoiceTtsRequest, VoiceTtsResponse } from "./voice";
export interface CreateRoomRequest {
    name: string;
    nativeLanguage: string;
    targetLanguage: string;
    mode?: RoomMode;
    userId?: string;
}
export interface JoinRoomRequest {
    code: string;
    name: string;
    nativeLanguage: string;
    targetLanguage: string;
    userId?: string;
}
export interface LeaveRoomRequest {
    roomId: string;
    participantId: string;
}
export interface RoomSessionResponse {
    roomState: RoomState;
    participant: Participant;
}
export interface ConfirmHeadphonesRequest {
    roomId: string;
    confirmed?: boolean;
}
export interface ParticipantUpdateResponse {
    participant: Participant;
    roomState: RoomState;
}
export interface StartSessionRequest {
    participantId: string;
}
export interface StartSessionResponse {
    roomState: RoomState;
    started: boolean;
    realtimeSession: RealtimeSessionMetadata;
}
export interface RoomRealtimeSessionResponse {
    roomState: RoomState;
    realtimeSession: RealtimeSessionMetadata | null;
}
export interface RealtimeCredentialsRequest {
    participantId: string;
}
export interface PresentationRequestToSpeakRequest {
    participantId: string;
}
export interface PresentationModerationRequest {
    hostParticipantId: string;
    participantId: string;
}
export interface PresentationReleaseFloorRequest {
    participantId: string;
}
export interface RealtimeCredentialsResponse {
    roomState: RoomState;
    realtimeSession: RealtimeSessionMetadata;
    credentials: RealtimeConnectionCredentials;
}
export interface StartSessionFailureDetails {
    readiness: RoomReadiness;
}
export interface ErrorResponse {
    error: {
        message: string;
        details?: unknown;
    };
}
export interface TranslatedVoiceRequest extends VoiceTtsRequest {
}
export interface TranslatedVoiceResponse extends VoiceTtsResponse {
}
