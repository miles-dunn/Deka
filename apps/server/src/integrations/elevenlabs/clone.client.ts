import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { env } from "../../config/env";
import type { CreateVoiceCloneInput, CreateVoiceCloneResult, ElevenLabsAddVoiceResponse, ElevenLabsMode } from "./elevenlabs.types";

const ELEVENLABS_ADD_VOICE_URL = "https://api.elevenlabs.io/v1/voices/add";
const missingSampleMessage = "upload at least one audio sample";

const resolveMode = (): ElevenLabsMode => {
  if (env.elevenLabsBootstrapMode === "live") {
    return "live";
  }

  if (env.elevenLabsBootstrapMode === "mock") {
    return "mock";
  }

  return env.elevenLabsApiKey ? "live" : "mock";
};

const createMockVoiceClone = (input: CreateVoiceCloneInput): CreateVoiceCloneResult => ({
  provider: "elevenlabs_mock",
  providerVoiceId: `mock_voice_${input.participantId}_${randomUUID().slice(0, 8)}`,
  requiresVerification: false,
  mode: "mock"
});

export const createElevenLabsVoiceClone = async (input: CreateVoiceCloneInput): Promise<CreateVoiceCloneResult> => {
  const mode = resolveMode();

  if (mode === "mock") {
    return createMockVoiceClone(input);
  }

  if (!env.elevenLabsApiKey) {
    throw new Error("ELEVENLABS_API_KEY is required for live ElevenLabs voice cloning");
  }

  const apiKey = env.elevenLabsApiKey;
  const absoluteSamplePath = path.resolve(process.cwd(), input.sampleFilePath);

  if (!fs.existsSync(absoluteSamplePath)) {
    throw new Error("Voice sample file was not found on disk");
  }

  const sampleBuffer = fs.readFileSync(absoluteSamplePath);
  const sizeBytes = fs.statSync(absoluteSamplePath).size;
  const filename = input.sampleOriginalName || path.basename(absoluteSamplePath);
  const mimeType = input.sampleMimeType || "audio/webm";

  const sendCloneRequest = async (fileField: "files" | "files[]") => {
    const file = new Blob([sampleBuffer], { type: mimeType });
    const formData = new FormData();
    formData.append("name", `Translator AI - ${input.participantName}`);
    formData.append("description", `MVP instant clone for participant ${input.participantId}`);
    formData.append("remove_background_noise", "true");
    formData.append(fileField, file, filename);

    console.info("[elevenlabs] clone request payload", {
      participantId: input.participantId,
      filename,
      mimeType,
      sizeBytes,
      fileField
    });

    const response = await fetch(ELEVENLABS_ADD_VOICE_URL, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey
      },
      body: formData
    });

    const data = (await response.json().catch(() => ({}))) as ElevenLabsAddVoiceResponse & { detail?: { message?: string } | string };
    const detail = typeof data.detail === "string" ? data.detail : data.detail?.message;

    return {
      response,
      data,
      detail
    };
  };

  let result = await sendCloneRequest("files");

  if (!result.response.ok && result.detail?.toLowerCase().includes(missingSampleMessage)) {
    console.warn("[elevenlabs] retrying clone request with alternate file field", {
      participantId: input.participantId,
      firstField: "files",
      retryField: "files[]",
      firstDetail: result.detail
    });
    result = await sendCloneRequest("files[]");
  }

  if (!result.response.ok || !result.data.voice_id) {
    console.error("[elevenlabs] clone response failed", {
      status: result.response.status,
      detail: result.detail ?? "No detail returned"
    });
    throw new Error(result.detail ?? `ElevenLabs clone creation failed with status ${result.response.status}`);
  }

  console.info("[elevenlabs] clone response success", {
    voiceId: result.data.voice_id,
    requiresVerification: Boolean(result.data.requires_verification)
  });

  return {
    provider: "elevenlabs",
    providerVoiceId: result.data.voice_id,
    requiresVerification: Boolean(result.data.requires_verification),
    mode: "live"
  };
};
