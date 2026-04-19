import type { ParticipantVoiceStatus } from "./voice";
import type { RealtimeSessionMetadata } from "./realtime";
export type RoomMode = "conversation" | "presentation";
export type RoomStatus = "waiting" | "almost_ready" | "ready" | "active" | "closed";
export type ParticipantRole = "host" | "speaker" | "listener" | "peer";
export type ConnectionStatus = "offline" | "online";
export type ReadinessRequirement = "connected" | "languages_selected" | "voice_sample_uploaded" | "headphones_confirmed" | "two_participants" | "conversation_mode" | "active_speaker_assigned" | "active_speaker_ready";
export interface SpeakRequest {
    participantId: string;
    requestedAt: string;
}
export interface Room {
    id: string;
    code: string;
    mode: RoomMode;
    hostParticipantId: string;
    activeSpeakerParticipantId: string | null;
    pendingSpeakRequests: SpeakRequest[];
    maxParticipants: number;
    status: RoomStatus;
    createdAt: string;
    realtimeSession: RealtimeSessionMetadata | null;
    createdByUserId?: string;
}
export interface Participant {
    id: string;
    roomId: string;
    name: string;
    role: ParticipantRole;
    nativeLanguage: string;
    targetLanguage: string;
    socketId: string | null;
    connectionStatus: ConnectionStatus;
    headphoneConfirmed: boolean;
    voiceProfileId: string | null;
    voiceProfileStatus: ParticipantVoiceStatus;
}
export interface ParticipantReadiness {
    participantId: string;
    connected: boolean;
    languagesSelected: boolean;
    voiceSampleUploaded: boolean;
    headphonesConfirmed: boolean;
    ready: boolean;
    missingRequirements: ReadinessRequirement[];
}
export interface RoomReadiness {
    ready: boolean;
    canStart: boolean;
    missingRequirements: ReadinessRequirement[];
    participants: ParticipantReadiness[];
}
export interface RoomState {
    room: Room;
    participants: Participant[];
    readiness: RoomReadiness;
}
