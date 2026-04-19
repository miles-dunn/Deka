import { randomUUID } from "node:crypto";
import fs from "node:fs";
import type {
  VoiceCloneResponse,
  VoiceCloneStatusResponse,
  VoiceProfile,
  VoiceProfileNextStep,
  VoiceProfileResponse,
  VoiceProfileUploadResponse,
  VoiceTtsResponse
} from "@translator/shared";
import { getParticipantById, getParticipantInRoom, markParticipantVoiceProfile } from "../rooms/room.service";
import { createElevenLabsVoiceClone } from "../../integrations/elevenlabs/clone.client";
import { synthesizeWithElevenLabs } from "../../integrations/elevenlabs/tts.client";
import { HttpError } from "../../utils/httpError";
import { getVoiceProfileByParticipantId, saveVoiceProfile, updateVoiceProfile } from "./voice.store";
import type { UploadedVoiceSample } from "./voice.types";
import { MIN_VOICE_SAMPLE_SECONDS, isAcceptedStoredAudioFile, toAbsoluteSamplePath } from "./voice.utils";

const getNextStep = (voiceProfile: VoiceProfile | null): VoiceProfileNextStep => {
  if (!voiceProfile) {
    return {
      provider: "elevenlabs",
      status: "not_started",
      sampleStatus: "no_sample",
      eligibleForClone: false,
      message: "Upload a clear voice sample before creating a clone."
    };
  }

  const status = voiceProfile?.providerStatus ?? "not_started";

  return {
    provider: "elevenlabs",
    status,
    sampleStatus: voiceProfile.sampleStatus,
    eligibleForClone: voiceProfile.eligibleForClone,
    message:
      status === "ready"
        ? "ElevenLabs clone is ready for cloned output routing."
        : voiceProfile.eligibleForClone
          ? "Voice sample is ready. Create the ElevenLabs voice clone next."
        : "Create or wait for the ElevenLabs voice clone; fallback audio remains available."
  };
};

const isVoiceReady = (status: string | undefined) => status === "uploaded" || status === "ready";
const isCloneReady = (voiceProfile: VoiceProfile | null) => voiceProfile?.providerStatus === "ready" && Boolean(voiceProfile.providerVoiceId);

const getReason = (voiceProfile: VoiceProfile | null) => {
  if (!voiceProfile) {
    return "No uploaded voice sample found.";
  }

  if (voiceProfile.providerStatus === "ready") {
    return "Voice clone created successfully.";
  }

  if (voiceProfile.providerStatus === "creating") {
    return "Voice clone creation is in progress.";
  }

  if (voiceProfile.providerStatus === "failed") {
    return voiceProfile.errorMessage ?? "Voice clone failed due to ElevenLabs API error.";
  }

  return voiceProfile.sampleValidationMessage;
};

const toCloneResponse = (voiceProfile: VoiceProfile): VoiceCloneResponse => ({
  voiceProfile,
  voiceReady: isVoiceReady(voiceProfile.status),
  cloneReady: isCloneReady(voiceProfile),
  sampleStatus: voiceProfile.sampleStatus,
  cloneStatus: voiceProfile.providerStatus,
  eligibleForClone: voiceProfile.eligibleForClone,
  reason: getReason(voiceProfile),
  durationSeconds: voiceProfile.sampleDurationSeconds,
  minimumRequiredSeconds: voiceProfile.minimumRequiredSeconds,
  providerStatus: voiceProfile.providerStatus,
  errorMessage: voiceProfile.errorMessage,
  outputRouting: voiceProfile.outputRouting
});

const toProfileResponse = (voiceProfile: VoiceProfile | null): VoiceProfileResponse => ({
  voiceProfile,
  voiceReady: isVoiceReady(voiceProfile?.status),
  sampleStatus: voiceProfile?.sampleStatus ?? "no_sample",
  cloneStatus: voiceProfile?.providerStatus ?? "not_started",
  eligibleForClone: voiceProfile?.eligibleForClone ?? false,
  reason: getReason(voiceProfile),
  durationSeconds: voiceProfile?.sampleDurationSeconds ?? null,
  minimumRequiredSeconds: voiceProfile?.minimumRequiredSeconds ?? MIN_VOICE_SAMPLE_SECONDS,
  nextStep: getNextStep(voiceProfile)
});

const finishVoiceCloneCreation = async (participantId: string, participantName: string, voiceProfile: VoiceProfile) => {
  try {
    const result = await createElevenLabsVoiceClone({
      participantId,
      participantName,
      sampleFilePath: voiceProfile.sampleFilePath,
      sampleMimeType: voiceProfile.sampleMimeType,
      sampleOriginalName: voiceProfile.sampleOriginalName
    });

    const readyProfile = updateVoiceProfile(participantId, (profile) => ({
      ...profile,
      status: "ready",
      provider: result.provider,
      providerVoiceId: result.providerVoiceId,
      providerStatus: "ready",
      outputRouting: "cloned_voice",
      errorMessage: undefined,
      updatedAt: new Date().toISOString()
    }));

    if (!readyProfile) {
      throw new Error("Voice profile disappeared during clone creation");
    }

    // TODO: persist providerVoiceId and clone status in durable storage.
    console.info("[voices] clone created", {
      participantId,
      provider: readyProfile.provider,
      providerVoiceId: readyProfile.providerVoiceId,
      providerStatus: readyProfile.providerStatus
    });
  } catch (error) {
    const failedProfile = updateVoiceProfile(participantId, (profile) => ({
      ...profile,
      status: "failed",
      provider: "elevenlabs",
      providerStatus: "failed",
      outputRouting: "fallback_default",
      errorMessage: error instanceof Error ? error.message : "ElevenLabs clone creation failed",
      updatedAt: new Date().toISOString()
    }));

    console.error("[voices] clone failed", {
      participantId,
      errorMessage: failedProfile?.errorMessage ?? "Unknown clone failure"
    });
  }
};

const evaluateSample = (sample: UploadedVoiceSample) => {
  const absoluteSamplePath = toAbsoluteSamplePath(sample.sampleFilePath);
  const exists = fs.existsSync(absoluteSamplePath);

  if (!exists) {
    return {
      sampleStatus: "invalid" as const,
      eligibleForClone: false,
      message: "No valid uploaded audio sample exists on the server."
    };
  }

  const sizeBytes = fs.statSync(absoluteSamplePath).size;

  if (sizeBytes <= 0) {
    return {
      sampleStatus: "invalid" as const,
      eligibleForClone: false,
      message: "Voice sample file is empty."
    };
  }

  if (!isAcceptedStoredAudioFile({ filePath: sample.sampleFilePath, mimeType: sample.mimeType, originalName: sample.originalName })) {
    return {
      sampleStatus: "invalid" as const,
      eligibleForClone: false,
      message: "Voice sample format is unsupported."
    };
  }

  if (sample.durationSeconds === null) {
    return {
      sampleStatus: "uploaded" as const,
      eligibleForClone: false,
      message: "Voice sample uploaded successfully, but its duration could not be confirmed. Record or upload again from the browser."
    };
  }

  if (sample.durationSeconds < MIN_VOICE_SAMPLE_SECONDS) {
    return {
      sampleStatus: "too_short" as const,
      eligibleForClone: false,
      message: "Voice sample uploaded successfully, but it is too short for cloning."
    };
  }

  return {
    sampleStatus: "ready_for_clone" as const,
    eligibleForClone: true,
    message: "Voice sample uploaded successfully and is ready for clone creation."
  };
};

export const createVoiceProfileFromSample = (sample: UploadedVoiceSample): VoiceProfileUploadResponse => {
  getParticipantInRoom(sample.roomId, sample.participantId);
  const now = new Date().toISOString();
  const sampleEvaluation = evaluateSample(sample);

  console.info("[voices] upload stored", {
    participantId: sample.participantId,
    roomId: sample.roomId,
    sampleFilePath: sample.sampleFilePath,
    mimeType: sample.mimeType,
    sizeBytes: sample.sizeBytes,
    durationSeconds: sample.durationSeconds,
    sampleStatus: sampleEvaluation.sampleStatus,
    eligibleForClone: sampleEvaluation.eligibleForClone
  });

  const voiceProfile = {
    id: randomUUID(),
    participantId: sample.participantId,
    roomId: sample.roomId,
    sampleFilePath: sample.sampleFilePath,
    sampleOriginalName: sample.originalName,
    sampleMimeType: sample.mimeType,
    sampleSizeBytes: sample.sizeBytes,
    sampleDurationSeconds: sample.durationSeconds,
    sampleStatus: sampleEvaluation.sampleStatus,
    eligibleForClone: sampleEvaluation.eligibleForClone,
    sampleValidationMessage: sampleEvaluation.message,
    minimumRequiredSeconds: MIN_VOICE_SAMPLE_SECONDS,
    status: sampleEvaluation.sampleStatus === "invalid" ? ("failed" as const) : ("uploaded" as const),
    provider: "pending" as const,
    providerVoiceId: null,
    providerStatus: "not_started" as const,
    outputRouting: "fallback_default" as const,
    createdAt: now,
    updatedAt: now
  };

  saveVoiceProfile(voiceProfile);

  // TODO: persist uploaded voice profile metadata in a database.
  const roomState = markParticipantVoiceProfile(sample.roomId, sample.participantId, voiceProfile.id, voiceProfile.status);

  return {
    ...toProfileResponse(voiceProfile),
    roomState
  };
};

export const getParticipantVoiceProfile = (participantId: string): VoiceProfileResponse => {
  getParticipantById(participantId);

  const voiceProfile = getVoiceProfileByParticipantId(participantId);

  return toProfileResponse(voiceProfile);
};

export const startVoiceClone = async (participantId: string): Promise<VoiceCloneResponse> => {
  const participant = getParticipantById(participantId);
  const existingProfile = getVoiceProfileByParticipantId(participantId);

  if (!existingProfile) {
    throw new HttpError(404, "Voice sample must be uploaded before creating a clone");
  }

  if (existingProfile.providerStatus === "ready") {
    return toCloneResponse(existingProfile);
  }

  if (existingProfile.providerStatus === "creating") {
    return toCloneResponse(existingProfile);
  }

  if (!existingProfile.eligibleForClone) {
    throw new HttpError(422, existingProfile.sampleValidationMessage, {
      sampleStatus: existingProfile.sampleStatus,
      cloneStatus: existingProfile.providerStatus,
      eligibleForClone: existingProfile.eligibleForClone,
      reason: existingProfile.sampleValidationMessage,
      durationSeconds: existingProfile.sampleDurationSeconds,
      minimumRequiredSeconds: existingProfile.minimumRequiredSeconds
    });
  }

  const absoluteSamplePath = toAbsoluteSamplePath(existingProfile.sampleFilePath);

  if (!fs.existsSync(absoluteSamplePath) || fs.statSync(absoluteSamplePath).size <= 0) {
    const invalidProfile = updateVoiceProfile(participantId, (profile) => ({
      ...profile,
      status: "failed",
      sampleStatus: "invalid",
      eligibleForClone: false,
      sampleValidationMessage: "No valid uploaded audio sample exists on the server.",
      errorMessage: "No valid uploaded audio sample exists on the server.",
      updatedAt: new Date().toISOString()
    }));

    throw new HttpError(422, "No valid uploaded audio sample exists on the server.", {
      voiceProfile: invalidProfile
    });
  }

  console.info("[voices] clone request started", {
    participantId,
    sampleFilePath: existingProfile.sampleFilePath,
    durationSeconds: existingProfile.sampleDurationSeconds,
    providerStatus: existingProfile.providerStatus
  });

  const creatingProfile = updateVoiceProfile(participantId, (profile) => ({
    ...profile,
    providerStatus: "creating",
    errorMessage: undefined,
    updatedAt: new Date().toISOString()
  }));

  if (!creatingProfile) {
    throw new Error("Voice profile disappeared before clone creation");
  }

  void finishVoiceCloneCreation(participantId, participant.name, existingProfile);

  return toCloneResponse(creatingProfile);
};

export const createUserProfileClone = async (input: {
  userId: string;
  userName: string;
  sampleFilePath: string;
  sampleMimeType?: string;
  sampleOriginalName?: string;
}): Promise<{ providerVoiceId: string; provider: string; requiresVerification: boolean }> => {
  const result = await createElevenLabsVoiceClone({
    participantId: input.userId,
    participantName: input.userName,
    sampleFilePath: input.sampleFilePath,
    sampleMimeType: input.sampleMimeType,
    sampleOriginalName: input.sampleOriginalName,
  });

  return {
    providerVoiceId: result.providerVoiceId,
    provider: result.provider,
    requiresVerification: result.requiresVerification,
  };
};

export const assignProfileCloneToParticipant = (participantId: string, providerVoiceId: string, provider: string): VoiceCloneResponse => {
  getParticipantById(participantId);

  const profile = getVoiceProfileByParticipantId(participantId);
  if (!profile) {
    throw new HttpError(404, "Voice profile not found — upload a voice sample first");
  }

  const readyProfile = updateVoiceProfile(participantId, (p) => ({
    ...p,
    status: "ready" as const,
    provider: provider as VoiceProfile["provider"],
    providerVoiceId,
    providerStatus: "ready" as const,
    outputRouting: "cloned_voice" as const,
    errorMessage: undefined,
    updatedAt: new Date().toISOString(),
  }));

  if (!readyProfile) {
    throw new HttpError(500, "Failed to assign voice clone to participant");
  }

  return toCloneResponse(readyProfile);
};

export const getVoiceCloneStatus = (participantId: string): VoiceCloneStatusResponse => {
  getParticipantById(participantId);

  const voiceProfile = getVoiceProfileByParticipantId(participantId);

  if (!voiceProfile) {
    throw new HttpError(404, "Voice profile not found");
  }

  return toCloneResponse(voiceProfile);
};

export const synthesizeTranslatedVoice = async (speakerParticipantId: string, text: string): Promise<VoiceTtsResponse> => {
  getParticipantById(speakerParticipantId);

  const voiceProfile = getVoiceProfileByParticipantId(speakerParticipantId);

  if (!voiceProfile || !isCloneReady(voiceProfile)) {
    return {
      outputRouting: "fallback_default",
      provider: voiceProfile?.provider ?? "pending",
      providerVoiceId: voiceProfile?.providerVoiceId ?? null,
      audioBase64: null,
      contentType: null,
      fallbackReason: "Speaker cloned voice is not ready"
    };
  }

  const result = await synthesizeWithElevenLabs({
    voiceId: voiceProfile.providerVoiceId,
    text
  });

  return {
    outputRouting: result.outputRouting,
    provider: result.provider,
    providerVoiceId: result.providerVoiceId,
    audioBase64: result.audioBuffer ? result.audioBuffer.toString("base64") : null,
    contentType: result.contentType,
    fallbackReason: result.fallbackReason
  };
};
