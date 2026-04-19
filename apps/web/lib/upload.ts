import type { VoiceProfileResponse, VoiceProfileUploadResponse } from "@translator/shared";
import { API_BASE_URL } from "./api";

const readJsonResponse = async <T>(response: Response): Promise<T> => {
  const data = await response.json();

  if (!response.ok) {
    const detailReason = data?.error?.details?.reason;
    const reasonText = typeof detailReason === "string" ? ` ${detailReason}` : "";
    throw new Error(`${data?.error?.message ?? "Request failed"}.${reasonText}`);
  }

  return data as T;
};

export const uploadVoiceSample = async (input: { roomId: string; participantId: string; audio: File | Blob; durationSeconds?: number | null }) => {
  const formData = new FormData();
  const audioFile =
    input.audio instanceof File
      ? input.audio
      : new File([input.audio], "voice-sample.webm", { type: input.audio.type || "audio/webm" });

  formData.append("roomId", input.roomId);
  formData.append("participantId", input.participantId);
  if (input.durationSeconds) {
    formData.append("durationSeconds", String(input.durationSeconds));
  }
  formData.append("audio", audioFile);

  const response = await fetch(`${API_BASE_URL}/api/voices/upload`, {
    method: "POST",
    body: formData
  });

  return readJsonResponse<VoiceProfileUploadResponse>(response);
};

export const uploadVoiceSampleFromUrl = async (input: { roomId: string; participantId: string; voiceSampleUrl: string; durationSeconds?: number }) => {
  const response = await fetch(`${API_BASE_URL}/api/voices/upload-from-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return readJsonResponse<VoiceProfileUploadResponse>(response);
};

export const getVoiceProfile = async (participantId: string) => {
  const response = await fetch(`${API_BASE_URL}/api/voices/${participantId}`);

  return readJsonResponse<VoiceProfileResponse>(response);
};
