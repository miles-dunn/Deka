import type { Participant, RoomState } from "@translator/shared";

const sessionKey = (roomId: string) => `translator-ai:room:${roomId}`;

export const saveRoomSession = (roomState: RoomState, participant: Participant) => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(
    sessionKey(roomState.room.id),
    JSON.stringify({
      participantId: participant.id,
      roomId: roomState.room.id
    })
  );
};

export const clearRoomSession = (roomId: string) => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(sessionKey(roomId));
};
