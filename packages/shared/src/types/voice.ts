import type { RoomState } from "./room";

export type VoiceProfileStatus = "uploaded" | "ready" | "failed";
export type VoiceSampleStatus = "no_sample" | "uploaded" | "invalid" | "too_short" | "ready_for_clone";
export type VoiceProfileProvider = "pending" | "elevenlabs" | "elevenlabs_mock";
export type VoiceCloneStatus = "not_started" | "creating" | "ready" | "failed";
export type VoiceOutputRouting = "cloned_voice" | "fallback_default";
export type ParticipantVoiceStatus = "missing" | VoiceProfileStatus;

export interface VoiceProfile {
  id: string;
  participantId: string;
  roomId: string;
  sampleFilePath: string;
  sampleOriginalName?: string;
  sampleMimeType?: string;
  sampleSizeBytes?: number;
  sampleDurationSeconds: number | null;
  sampleStatus: VoiceSampleStatus;
  eligibleForClone: boolean;
  sampleValidationMessage: string;
  minimumRequiredSeconds: number;
  status: VoiceProfileStatus;
  provider: VoiceProfileProvider;
  providerVoiceId: string | null;
  providerStatus: VoiceCloneStatus;
  outputRouting: VoiceOutputRouting;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VoiceProfileNextStep {
  provider: "elevenlabs";
  status: VoiceCloneStatus;
  sampleStatus: VoiceSampleStatus;
  eligibleForClone: boolean;
  message: string;
}

export interface VoiceProfileResponse {
  voiceProfile: VoiceProfile | null;
  voiceReady: boolean;
  sampleStatus: VoiceSampleStatus;
  cloneStatus: VoiceCloneStatus;
  eligibleForClone: boolean;
  reason: string;
  durationSeconds: number | null;
  minimumRequiredSeconds: number;
  nextStep: VoiceProfileNextStep;
}

export interface VoiceProfileUploadResponse extends VoiceProfileResponse {
  roomState: RoomState;
}

export interface VoiceCloneResponse {
  voiceProfile: VoiceProfile;
  voiceReady: boolean;
  cloneReady: boolean;
  sampleStatus: VoiceSampleStatus;
  cloneStatus: VoiceCloneStatus;
  eligibleForClone: boolean;
  reason: string;
  durationSeconds: number | null;
  minimumRequiredSeconds: number;
  providerStatus: VoiceCloneStatus;
  errorMessage?: string;
  outputRouting: VoiceOutputRouting;
}

export interface VoiceCloneStatusResponse extends VoiceCloneResponse {}

export interface VoiceTtsRequest {
  text: string;
  speakerParticipantId: string;
  listenerParticipantId?: string;
}

export interface VoiceTtsResponse {
  outputRouting: VoiceOutputRouting;
  provider: VoiceProfileProvider;
  providerVoiceId: string | null;
  audioBase64: string | null;
  contentType: string | null;
  fallbackReason?: string;
}
