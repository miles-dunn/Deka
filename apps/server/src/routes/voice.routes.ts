import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { Router } from "express";
import {
  assignProfileCloneToParticipant,
  createUserProfileClone,
  createVoiceProfileFromSample,
  getParticipantVoiceProfile,
  getVoiceCloneStatus,
  startVoiceClone,
  synthesizeTranslatedVoice
} from "../modules/voices/voice.service";
import {
  ensureVoiceUploadDirectory,
  MAX_VOICE_SAMPLE_BYTES,
  MIN_VOICE_SAMPLE_SECONDS,
  parseDurationSeconds,
  toStoredSamplePath,
  VOICE_UPLOAD_DIR,
  voiceFileFilter,
  voiceSampleStorage
} from "../modules/voices/voice.utils";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../utils/httpError";
import type { AppSocketServer } from "../types/socket";

const upload = multer({
  storage: voiceSampleStorage,
  fileFilter: voiceFileFilter,
  limits: {
    fileSize: MAX_VOICE_SAMPLE_BYTES,
    files: 1
  }
});

const voiceUploadMiddleware = upload.single("audio");

export const createVoiceRouter = (io: AppSocketServer) => {
  const router = Router();

  router.post(
    "/upload",
    (req, res, next) => {
      voiceUploadMiddleware(req, res, (error) => {
        if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
          next(new HttpError(400, "Audio file must be 10 MB or smaller"));
          return;
        }

        next(error);
      });
    },
    asyncHandler((req, res) => {
      const participantId = typeof req.body.participantId === "string" ? req.body.participantId.trim() : "";
      const roomId = typeof req.body.roomId === "string" ? req.body.roomId.trim() : "";

      if (!participantId) {
        throw new HttpError(400, "participantId is required");
      }

      if (!roomId) {
        throw new HttpError(400, "roomId is required");
      }

      if (!req.file) {
        throw new HttpError(400, "audio file is required");
      }

      console.info("[voices] upload received", {
        participantId,
        roomId,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        storedPath: toStoredSamplePath(req.file.path),
        durationSeconds: parseDurationSeconds(req.body.durationSeconds)
      });

      const response = createVoiceProfileFromSample({
        participantId,
        roomId,
        sampleFilePath: toStoredSamplePath(req.file.path),
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        durationSeconds: parseDurationSeconds(req.body.durationSeconds)
      });

      const participant = response.roomState.participants.find((item) => item.id === participantId);

      if (participant) {
        io.to(roomId).emit("participant:updated", {
          roomId,
          participant,
          roomState: response.roomState
        });
      }

      io.to(roomId).emit("room:readiness-updated", {
        roomId,
        readiness: response.roomState.readiness,
        roomState: response.roomState
      });
      io.to(roomId).emit("room:updated", response.roomState);

      res.status(201).json(response);
    })
  );

  // Create a user-level profile clone (not tied to a room/participant)
  router.post(
    "/create-profile-clone",
    asyncHandler(async (req, res) => {
      const userId = typeof req.body.userId === "string" ? req.body.userId.trim() : "";
      const userName = typeof req.body.userName === "string" ? req.body.userName.trim() : "User";
      const voiceSampleUrl = typeof req.body.voiceSampleUrl === "string" ? req.body.voiceSampleUrl.trim() : "";
      const durationSeconds = parseDurationSeconds(req.body.durationSeconds);

      if (!userId) throw new HttpError(400, "userId is required");
      if (!voiceSampleUrl) throw new HttpError(400, "voiceSampleUrl is required");
      if (durationSeconds !== null && durationSeconds < MIN_VOICE_SAMPLE_SECONDS) {
        throw new HttpError(422, `Voice sample must be at least ${MIN_VOICE_SAMPLE_SECONDS} seconds`);
      }

      const audioResponse = await fetch(voiceSampleUrl);
      if (!audioResponse.ok) {
        throw new HttpError(400, `Could not fetch voice sample: ${audioResponse.statusText}`);
      }

      const buffer = Buffer.from(await audioResponse.arrayBuffer());
      if (buffer.length > MAX_VOICE_SAMPLE_BYTES) {
        throw new HttpError(400, "Audio file must be 10 MB or smaller");
      }

      ensureVoiceUploadDirectory();
      const filename = `${Date.now()}-profile-${userId}.webm`;
      const filePath = path.join(VOICE_UPLOAD_DIR, filename);
      fs.writeFileSync(filePath, buffer);

      try {
        const result = await createUserProfileClone({
          userId,
          userName,
          sampleFilePath: toStoredSamplePath(filePath),
          sampleMimeType: "audio/webm",
          sampleOriginalName: "voice-sample.webm",
        });
        res.status(200).json(result);
      } finally {
        try { fs.unlinkSync(filePath); } catch { /* temp file cleanup */ }
      }
    })
  );

  // Assign an already-created profile clone to a room participant (skip re-cloning)
  router.post(
    "/:participantId/assign-clone",
    asyncHandler((req, res) => {
      const { participantId } = req.params as { participantId: string };
      const providerVoiceId = typeof req.body.providerVoiceId === "string" ? req.body.providerVoiceId.trim() : "";
      const provider = typeof req.body.provider === "string" ? req.body.provider.trim() : "elevenlabs";

      if (!providerVoiceId) throw new HttpError(400, "providerVoiceId is required");

      res.status(200).json(assignProfileCloneToParticipant(participantId, providerVoiceId, provider));
    })
  );

  // Upload voice sample by fetching from a URL (avoids client-side CORS with Firebase Storage)
  router.post(
    "/upload-from-url",
    asyncHandler(async (req, res) => {
      const participantId = typeof req.body.participantId === "string" ? req.body.participantId.trim() : "";
      const roomId = typeof req.body.roomId === "string" ? req.body.roomId.trim() : "";
      const voiceSampleUrl = typeof req.body.voiceSampleUrl === "string" ? req.body.voiceSampleUrl.trim() : "";
      const durationSeconds = parseDurationSeconds(req.body.durationSeconds);

      if (!participantId) throw new HttpError(400, "participantId is required");
      if (!roomId) throw new HttpError(400, "roomId is required");
      if (!voiceSampleUrl) throw new HttpError(400, "voiceSampleUrl is required");

      const audioResponse = await fetch(voiceSampleUrl);
      if (!audioResponse.ok) {
        throw new HttpError(400, `Failed to fetch voice sample from URL: ${audioResponse.statusText}`);
      }

      const contentType = audioResponse.headers.get("content-type") || "audio/webm";
      const buffer = Buffer.from(await audioResponse.arrayBuffer());

      if (buffer.length > MAX_VOICE_SAMPLE_BYTES) {
        throw new HttpError(400, "Audio file must be 10 MB or smaller");
      }

      ensureVoiceUploadDirectory();
      const filename = `${Date.now()}-profile-sample.webm`;
      const filePath = path.join(VOICE_UPLOAD_DIR, filename);
      fs.writeFileSync(filePath, buffer);

      const response = createVoiceProfileFromSample({
        participantId,
        roomId,
        sampleFilePath: toStoredSamplePath(filePath),
        originalName: "voice-sample.webm",
        mimeType: contentType,
        sizeBytes: buffer.length,
        durationSeconds,
      });

      const participant = response.roomState.participants.find((item) => item.id === participantId);
      if (participant) {
        io.to(roomId).emit("participant:updated", { roomId, participant, roomState: response.roomState });
      }
      io.to(roomId).emit("room:readiness-updated", { roomId, readiness: response.roomState.readiness, roomState: response.roomState });
      io.to(roomId).emit("room:updated", response.roomState);

      res.status(201).json(response);
    })
  );

  router.get(
    "/:participantId",
    asyncHandler((req, res) => {
      const { participantId } = req.params as { participantId: string };

      res.status(200).json(getParticipantVoiceProfile(participantId));
    })
  );

  router.post(
    "/:participantId/clone",
    asyncHandler(async (req, res) => {
      const { participantId } = req.params as { participantId: string };
      const response = await startVoiceClone(participantId);

      res.status(response.voiceProfile.providerStatus === "creating" ? 202 : 200).json(response);
    })
  );

  router.get(
    "/:participantId/clone-status",
    asyncHandler((req, res) => {
      const { participantId } = req.params as { participantId: string };

      res.status(200).json(getVoiceCloneStatus(participantId));
    })
  );

  router.post(
    "/tts",
    asyncHandler(async (req, res) => {
      const text = typeof req.body.text === "string" ? req.body.text.trim() : "";
      const speakerParticipantId = typeof req.body.speakerParticipantId === "string" ? req.body.speakerParticipantId.trim() : "";

      if (!text) {
        throw new HttpError(400, "text is required");
      }

      if (!speakerParticipantId) {
        throw new HttpError(400, "speakerParticipantId is required");
      }

      res.status(200).json(await synthesizeTranslatedVoice(speakerParticipantId, text));
    })
  );

  return router;
};
