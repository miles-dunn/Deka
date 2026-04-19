import { randomBytes } from "node:crypto";
import { ROOM_CODE_LENGTH } from "@translator/shared";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const generateRoomCode = () => {
  const bytes = randomBytes(ROOM_CODE_LENGTH);
  let code = "";

  for (const byte of bytes) {
    code += ALPHABET[byte % ALPHABET.length];
  }

  return code;
};
