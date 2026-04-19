import { randomUUID } from "node:crypto";
import { env } from "../../config/env";
import type { RealtimeBootstrapMode } from "@translator/shared";
import type { BootstrapRealtimeSessionInput, OpenAIClientSecretResponse, RealtimeBootstrapResult } from "./realtime.types";

const OPENAI_REALTIME_CLIENT_SECRET_URL = "https://api.openai.com/v1/realtime/client_secrets";
export const OPENAI_REALTIME_CALLS_URL = "https://api.openai.com/v1/realtime/calls";
const CLIENT_SECRET_TTL_SECONDS = 600;

const toIsoFromSeconds = (timestamp: number | undefined) => (timestamp ? new Date(timestamp * 1000).toISOString() : null);

const resolveBootstrapMode = (): RealtimeBootstrapMode => {
  if (env.openaiRealtimeBootstrapMode === "live") {
    return "live";
  }

  if (env.openaiRealtimeBootstrapMode === "mock") {
    return "mock";
  }

  return env.openaiApiKey ? "live" : "mock";
};

const buildInstructions = (input: BootstrapRealtimeSessionInput) => {
  const languagePairs = input.participants
    .map((participant) => `${participant.name}: ${participant.nativeLanguage} to ${participant.targetLanguage}`)
    .join("; ");

  if (input.roomMode === "presentation") {
    const activeSpeaker = input.participants.find((participant) => participant.id === input.activeSpeakerParticipantId);
    const activeSpeakerLabel = activeSpeaker ? `${activeSpeaker.name} (${activeSpeaker.nativeLanguage})` : "unassigned";

    return [
      "You are a real-time interpreter for a controlled presentation room.",
      "Only the active speaker should be interpreted at a time.",
      "Transcribe and translate the active speaker's turn into concise text output.",
      "Do not include system commentary. Return only translated text.",
      `Current active speaker: ${activeSpeakerLabel}.`,
      `Room participants and language directions: ${languagePairs}.`,
      "Do not produce spoken audio in this MVP call UI. Text translation is the source of truth."
    ].join("\n");
  }

  return [
    "You are a real-time interpreter for a two-person conversation.",
    "When one participant speaks, translate their meaning into the other participant's target language.",
    "Return only the translated text for the listener. Do not repeat the original speech.",
    "Keep translations concise and natural. Do not add commentary unless the speaker asks for it.",
    "Support a one-speaker-at-a-time flow and wait for each turn to finish before responding.",
    `Room participants and language directions: ${languagePairs}.`,
    "Do not produce spoken audio in this MVP call UI. Text translation is the source of truth."
  ].join("\n");
};

const createMockRealtimeSession = (input: BootstrapRealtimeSessionInput): RealtimeBootstrapResult => {
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + CLIENT_SECRET_TTL_SECONDS * 1000);

  return {
    metadata: {
      id: `mock_rt_${randomUUID()}`,
      provider: "openai_mock",
      status: "bootstrapped",
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      connectionStatus: "bootstrapped",
      connectionMode: "webrtc",
      mode: "realtime",
      roomId: input.roomId,
      model: env.openaiRealtimeModel,
      bootstrapMode: "mock",
      clientSecretExpiresAt: expiresAt.toISOString()
    },
    clientSecret: `mock_ek_${randomUUID()}`
  };
};

const createLiveRealtimeSession = async (input: BootstrapRealtimeSessionInput): Promise<RealtimeBootstrapResult> => {
  if (!env.openaiApiKey) {
    throw new Error("OPENAI_API_KEY is required for live OpenAI Realtime bootstrap");
  }

  const response = await fetch(OPENAI_REALTIME_CLIENT_SECRET_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.openaiApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      expires_after: {
        anchor: "created_at",
        seconds: CLIENT_SECRET_TTL_SECONDS
      },
      session: {
        type: "realtime",
        model: env.openaiRealtimeModel,
        output_modalities: ["text"],
        instructions: buildInstructions(input),
        audio: {
          input: {
            transcription: {
              model: "gpt-4o-mini-transcribe"
            },
            turn_detection: {
              type: "semantic_vad"
            }
          }
        }
      }
    })
  });

  const data = (await response.json().catch(() => ({}))) as OpenAIClientSecretResponse & { error?: { message?: string } };

  if (!response.ok) {
    throw new Error(data.error?.message ?? `OpenAI Realtime bootstrap failed with status ${response.status}`);
  }

  const createdAt = new Date();
  const clientSecretExpiresAt = toIsoFromSeconds(data.session?.client_secret?.expires_at ?? data.expires_at);
  const clientSecret = data.session?.client_secret?.value ?? data.value;

  if (!clientSecret) {
    throw new Error("OpenAI Realtime bootstrap did not return a client secret");
  }

  return {
    metadata: {
      id: data.session?.id ?? `openai_rt_${randomUUID()}`,
      provider: "openai",
      status: "bootstrapped",
      createdAt: createdAt.toISOString(),
      expiresAt: toIsoFromSeconds(data.expires_at) ?? clientSecretExpiresAt,
      connectionStatus: "bootstrapped",
      connectionMode: "webrtc",
      mode: "realtime",
      roomId: input.roomId,
      model: data.session?.model ?? env.openaiRealtimeModel,
      bootstrapMode: "live",
      clientSecretExpiresAt
    },
    clientSecret
  };
};

export const bootstrapRealtimeSession = async (input: BootstrapRealtimeSessionInput) => {
  const mode = resolveBootstrapMode();

  if (mode === "mock") {
    return createMockRealtimeSession(input);
  }

  return createLiveRealtimeSession(input);
};
