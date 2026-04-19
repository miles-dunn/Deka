import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { HttpError } from "../../utils/httpError";

export const MAX_VOICE_SAMPLE_BYTES = 10 * 1024 * 1024;
export const MIN_VOICE_SAMPLE_SECONDS = 15;
export const VOICE_UPLOAD_DIR = path.resolve(process.cwd(), "temp", "uploads");

const ACCEPTED_MIME_TYPES = new Set([
  "audio/aac",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "audio/x-m4a"
]);

const ACCEPTED_EXTENSIONS = new Set([".aac", ".m4a", ".mp3", ".mp4", ".oga", ".ogg", ".wav", ".webm"]);

export const ensureVoiceUploadDirectory = () => {
  fs.mkdirSync(VOICE_UPLOAD_DIR, { recursive: true });
};

export const isAcceptedAudioFile = (file: Express.Multer.File) => {
  const extension = path.extname(file.originalname).toLowerCase();

  return ACCEPTED_MIME_TYPES.has(file.mimetype) || ACCEPTED_EXTENSIONS.has(extension);
};

export const isAcceptedStoredAudioFile = (input: { filePath: string; mimeType?: string; originalName?: string }) => {
  const extension = path.extname(input.originalName || input.filePath).toLowerCase();

  return Boolean((input.mimeType && ACCEPTED_MIME_TYPES.has(input.mimeType)) || ACCEPTED_EXTENSIONS.has(extension));
};

export const parseDurationSeconds = (value: unknown) => {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? Math.round(value * 10) / 10 : null;
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const duration = Number(value);

  if (!Number.isFinite(duration) || duration <= 0) {
    return null;
  }

  return Math.round(duration * 10) / 10;
};

const sanitizeFilename = (filename: string) => filename.replace(/[^a-zA-Z0-9._-]/g, "_");

export const voiceSampleStorage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    ensureVoiceUploadDirectory();
    callback(null, VOICE_UPLOAD_DIR);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname) || ".webm";
    const baseName = sanitizeFilename(path.basename(file.originalname, extension)) || "voice-sample";
    callback(null, `${Date.now()}-${baseName}${extension.toLowerCase()}`);
  }
});

export const voiceFileFilter: multer.Options["fileFilter"] = (_req, file, callback) => {
  if (!isAcceptedAudioFile(file)) {
    callback(new HttpError(400, "Unsupported audio file type. Upload webm, wav, mp3, m4a, mp4, aac, or ogg audio."));
    return;
  }

  callback(null, true);
};

export const toStoredSamplePath = (filePath: string) => path.relative(process.cwd(), filePath).replace(/\\/g, "/");

export const toAbsoluteSamplePath = (sampleFilePath: string) => path.resolve(process.cwd(), sampleFilePath);
