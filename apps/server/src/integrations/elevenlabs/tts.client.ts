import { env } from "../../config/env";
import type { SynthesizeSpeechInput, SynthesizeSpeechResult } from "./elevenlabs.types";

const buildTtsUrl = (voiceId: string) =>
  `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`;

export const synthesizeWithElevenLabs = async (input: SynthesizeSpeechInput): Promise<SynthesizeSpeechResult> => {
  if (!input.voiceId) {
    return {
      outputRouting: "fallback_default",
      provider: "pending",
      providerVoiceId: null,
      audioBuffer: null,
      contentType: null,
      fallbackReason: "No cloned voice ID is available"
    };
  }

  if (!env.elevenLabsApiKey || env.elevenLabsBootstrapMode === "mock") {
    return {
      outputRouting: "fallback_default",
      provider: env.elevenLabsBootstrapMode === "mock" ? "elevenlabs_mock" : "pending",
      providerVoiceId: input.voiceId,
      audioBuffer: null,
      contentType: null,
      fallbackReason: "ElevenLabs TTS is in mock mode or missing an API key"
    };
  }

  const response = await fetch(buildTtsUrl(input.voiceId), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": env.elevenLabsApiKey
    },
    body: JSON.stringify({
      text: input.text,
      model_id: env.elevenLabsTtsModelId
    })
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");

    return {
      outputRouting: "fallback_default",
      provider: "elevenlabs",
      providerVoiceId: input.voiceId,
      audioBuffer: null,
      contentType: null,
      fallbackReason: errorText || `ElevenLabs TTS failed with status ${response.status}`
    };
  }

  return {
    outputRouting: "cloned_voice",
    provider: "elevenlabs",
    providerVoiceId: input.voiceId,
    audioBuffer: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get("content-type") ?? "audio/mpeg"
  };
};
