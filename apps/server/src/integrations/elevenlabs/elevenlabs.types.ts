import type { VoiceOutputRouting, VoiceProfileProvider } from "@translator/shared";

export type ElevenLabsMode = "live" | "mock";

export interface CreateVoiceCloneInput {
  participantId: string;
  participantName: string;
  sampleFilePath: string;
  sampleOriginalName?: string;
  sampleMimeType?: string;
}

export interface CreateVoiceCloneResult {
  provider: VoiceProfileProvider;
  providerVoiceId: string;
  requiresVerification: boolean;
  mode: ElevenLabsMode;
}

export interface ElevenLabsAddVoiceResponse {
  voice_id?: string;
  requires_verification?: boolean;
}

export interface SynthesizeSpeechInput {
  voiceId: string | null;
  text: string;
}

export interface SynthesizeSpeechResult {
  outputRouting: VoiceOutputRouting;
  provider: VoiceProfileProvider;
  providerVoiceId: string | null;
  audioBuffer: Buffer | null;
  contentType: string | null;
  fallbackReason?: string;
}
