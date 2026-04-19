import { randomUUID } from "node:crypto";
import type { Participant, ParticipantRole } from "@translator/shared";

interface CreateParticipantParams {
  roomId: string;
  name: string;
  role: ParticipantRole;
  nativeLanguage: string;
  targetLanguage: string;
}

export const createParticipant = (params: CreateParticipantParams): Participant => ({
  id: randomUUID(),
  roomId: params.roomId,
  name: params.name,
  role: params.role,
  nativeLanguage: params.nativeLanguage,
  targetLanguage: params.targetLanguage,
  socketId: null,
  connectionStatus: "offline",
  headphoneConfirmed: false,
  voiceProfileId: null,
  voiceProfileStatus: "missing"
  // TODO: ElevenLabs voice profile creation
});
