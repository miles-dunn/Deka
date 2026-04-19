import { DEFAULT_ROOM_MODE, normalizeSupportedLanguage } from "@translator/shared";
import type { CreateRoomRequest, JoinRoomRequest, LeaveRoomRequest, RoomMode } from "@translator/shared";
import { HttpError } from "./httpError";

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const requireText = (body: Record<string, unknown>, field: string, maxLength = 80) => {
  const value = body[field];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HttpError(400, `${field} is required`);
  }

  const normalized = value.trim();

  if (normalized.length > maxLength) {
    throw new HttpError(400, `${field} must be ${maxLength} characters or fewer`);
  }

  return normalized;
};

const parseMode = (value: unknown): RoomMode => {
  if (value === undefined) {
    return DEFAULT_ROOM_MODE;
  }

  if (value === "conversation" || value === "presentation") {
    return value;
  }

  if (value === "speaker") {
    return "presentation";
  }

  throw new HttpError(400, "mode must be conversation or presentation");
};

const requireLanguage = (body: Record<string, unknown>, field: string) => {
  const value = requireText(body, field, 40);
  const language = normalizeSupportedLanguage(value);

  if (!language) {
    throw new HttpError(400, `${field} must be a supported language`);
  }

  return language;
};

const ensureBody = (body: unknown) => {
  if (!isObject(body)) {
    throw new HttpError(400, "Request body must be an object");
  }

  return body;
};

export const validateCreateRoomRequest = (body: unknown): CreateRoomRequest => {
  const data = ensureBody(body);

  return {
    name: requireText(data, "name"),
    nativeLanguage: requireLanguage(data, "nativeLanguage"),
    targetLanguage: requireLanguage(data, "targetLanguage"),
    mode: parseMode(data.mode)
  };
};

export const validateJoinRoomRequest = (body: unknown): JoinRoomRequest => {
  const data = ensureBody(body);

  return {
    code: requireText(data, "code", 12).toUpperCase(),
    name: requireText(data, "name"),
    nativeLanguage: requireLanguage(data, "nativeLanguage"),
    targetLanguage: requireLanguage(data, "targetLanguage")
  };
};

export const validateLeaveRoomRequest = (body: unknown): LeaveRoomRequest => {
  const data = ensureBody(body);

  return {
    roomId: requireText(data, "roomId"),
    participantId: requireText(data, "participantId")
  };
};
