import type { RealtimeConnectionCredentials } from "@translator/shared";
import type { ParsedRealtimeEvent, TranscriptRole } from "../types/realtime";

export const OPENAI_REALTIME_DATA_CHANNEL = "oai-events";

export const isMockRealtimeCredentials = (credentials: RealtimeConnectionCredentials) =>
  credentials.bootstrapMode === "mock" || credentials.provider === "openai_mock";

export const postRealtimeSdpOffer = async (credentials: RealtimeConnectionCredentials, sdp: string) => {
  if (!credentials.realtimeUrl) {
    throw new Error("Realtime URL is missing");
  }

  const response = await fetch(credentials.realtimeUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credentials.clientSecret}`,
      "Content-Type": "application/sdp"
    },
    body: sdp
  });

  const answerSdp = await response.text();

  if (!response.ok) {
    throw new Error(answerSdp || `Realtime SDP exchange failed with status ${response.status}`);
  }

  return answerSdp;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const getString = (value: unknown) => (typeof value === "string" ? value : undefined);

const getContentTranscript = (payload: Record<string, unknown>, role: TranscriptRole) => {
  const item = isRecord(payload.item) ? payload.item : undefined;
  const itemRole = getString(item?.role);

  if (itemRole && itemRole !== role) {
    return undefined;
  }

  const content = Array.isArray(item?.content) ? item.content : [];

  for (const part of content) {
    if (!isRecord(part)) {
      continue;
    }

    const transcript = getString(part.transcript) ?? getString(part.text);

    if (transcript) {
      return transcript;
    }
  }

  return undefined;
};

export const parseRealtimeServerEvent = (payload: unknown): ParsedRealtimeEvent => {
  if (!isRecord(payload)) {
    return {
      type: "realtime.unknown"
    };
  }

  const type = getString(payload.type) ?? "realtime.event";

  switch (type) {
    case "session.created":
    case "session.updated":
      return { type, lifecycle: "idle" };

    case "input_audio_buffer.speech_started":
      return { type, lifecycle: "listening" };

    case "input_audio_buffer.speech_stopped":
    case "input_audio_buffer.committed":
      return { type, lifecycle: "processing" };

    case "conversation.item.input_audio_transcription.delta":
      return {
        type,
        lifecycle: "listening",
        transcript: {
          role: "user",
          text: getString(payload.delta) ?? "",
          isFinal: false,
          sourceEventType: type
        }
      };

    case "conversation.item.input_audio_transcription.completed":
      return {
        type,
        lifecycle: "processing",
        transcript: {
          role: "user",
          text: getString(payload.transcript) ?? "",
          isFinal: true,
          sourceEventType: type
        }
      };

    case "response.created":
    case "response.output_item.added":
    case "response.content_part.added":
      return { type, lifecycle: "responding" };

    case "response.output_text.delta":
    case "response.text.delta":
    case "response.output_audio_transcript.delta":
      return {
        type,
        lifecycle: "responding",
        transcript: {
          role: "assistant",
          text: getString(payload.delta) ?? "",
          isFinal: false,
          sourceEventType: type
        }
      };

    case "response.output_text.done":
    case "response.text.done":
      return {
        type,
        lifecycle: "responding",
        transcript: {
          role: "assistant",
          text: getString(payload.text) ?? getString(payload.transcript) ?? "",
          isFinal: true,
          sourceEventType: type
        }
      };

    case "response.output_audio_transcript.done":
      return {
        type,
        lifecycle: "responding",
        transcript: {
          role: "assistant",
          text: getString(payload.transcript) ?? "",
          isFinal: true,
          sourceEventType: type
        }
      };

    case "conversation.item.done": {
      const assistantTranscript = getContentTranscript(payload, "assistant");
      const userTranscript = getContentTranscript(payload, "user");
      const transcript = assistantTranscript
        ? { role: "assistant" as const, text: assistantTranscript, isFinal: true, sourceEventType: type }
        : userTranscript
          ? { role: "user" as const, text: userTranscript, isFinal: true, sourceEventType: type }
          : undefined;

      return { type, transcript };
    }

    case "response.output_audio.delta":
      return { type, lifecycle: "responding", translatedAudioReceived: true, remoteAudioActive: true };

    case "response.output_audio.done":
      return { type, lifecycle: "responding", translatedAudioReceived: true };

    case "output_audio_buffer.started":
      return { type, lifecycle: "responding", remoteAudioActive: true, translatedAudioReceived: true };

    case "output_audio_buffer.stopped":
      return { type, lifecycle: "completed", remoteAudioActive: false };

    case "response.done": {
      const response = isRecord(payload.response) ? payload.response : undefined;
      const status = getString(response?.status);

      return {
        type,
        lifecycle: status === "failed" || status === "incomplete" ? "failed" : "completed"
      };
    }

    case "error": {
      const error = isRecord(payload.error) ? payload.error : undefined;

      return {
        type,
        lifecycle: "failed",
        errorMessage: getString(error?.message) ?? "Realtime server error"
      };
    }

    default:
      return { type };
  }
};
