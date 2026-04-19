import type { Participant, Room } from "@translator/shared";

export interface RoomRecord {
  room: Room;
  participants: Map<string, Participant>;
}

const roomsById = new Map<string, RoomRecord>();
const roomIdByCode = new Map<string, string>();

export const saveRoomRecord = (record: RoomRecord) => {
  roomsById.set(record.room.id, record);
  roomIdByCode.set(record.room.code, record.room.id);
};

export const getRoomRecord = (roomId: string) => roomsById.get(roomId);

export const getRoomRecordByCode = (code: string) => {
  const roomId = roomIdByCode.get(code.toUpperCase());
  return roomId ? roomsById.get(roomId) : undefined;
};

export const isRoomCodeTaken = (code: string) => roomIdByCode.has(code);

export const getAllRoomRecords = () => Array.from(roomsById.values());
