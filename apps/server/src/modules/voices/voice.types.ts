import type { VoiceProfile } from "@translator/shared";

export interface UploadedVoiceSample {
  participantId: string;
  roomId: string;
  sampleFilePath: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  durationSeconds: number | null;
}

export interface StoredVoiceProfile extends VoiceProfile {}
