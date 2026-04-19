export type MicPermissionState = "unknown" | "granted" | "denied";
export type RealtimeConnectionState = "idle" | "connecting" | "connected" | "failed" | "closed";
export type ResponseLifecycleState = "idle" | "listening" | "processing" | "responding" | "completed" | "failed";
export type SpeakingTurnState = "idle" | "speaking" | "stopped";
export type TranscriptRole = "user" | "assistant";

export interface RealtimeDebugEvent {
  id: string;
  timestamp: string;
  direction: "state" | "incoming" | "outgoing" | "error";
  type: string;
  detail?: string;
}

export interface TranscriptEntry {
  id: string;
  timestamp: string;
  role: TranscriptRole;
  text: string;
  isFinal: boolean;
  sourceEventType: string;
}

export interface TranscriptUpdate {
  role: TranscriptRole;
  text: string;
  isFinal: boolean;
  sourceEventType: string;
}

export interface ParsedRealtimeEvent {
  type: string;
  lifecycle?: ResponseLifecycleState;
  transcript?: TranscriptUpdate;
  remoteAudioActive?: boolean;
  translatedAudioReceived?: boolean;
  errorMessage?: string;
}
