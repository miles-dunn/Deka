import type { Participant, RealtimeSessionMetadata, RoomMode } from "@translator/shared";

export interface BootstrapRealtimeSessionInput {
  roomId: string;
  roomMode: RoomMode;
  activeSpeakerParticipantId: string | null;
  participants: Participant[];
}

export interface OpenAIClientSecretResponse {
  value?: string;
  expires_at?: number;
  session?: {
    id?: string;
    model?: string;
    client_secret?: {
      expires_at?: number;
      value?: string;
    };
  };
}

export interface RealtimeBootstrapResult {
  metadata: RealtimeSessionMetadata;
  clientSecret?: string;
}
