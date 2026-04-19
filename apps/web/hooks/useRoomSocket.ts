"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ClientToServerEvents,
  PresentationTranslationDelivery,
  RoomState,
  ServerToClientEvents
} from "@translator/shared";
import type { Socket } from "socket.io-client";
import { createRoomSocket } from "../lib/socket";

interface UseRoomSocketParams {
  roomId: string;
  participantId: string;
  enabled: boolean;
}

export const useRoomSocket = ({ roomId, participantId, enabled }: UseRoomSocketParams) => {
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [events, setEvents] = useState<string[]>([]);
  const [presentationTranslations, setPresentationTranslations] = useState<PresentationTranslationDelivery[]>([]);
  const [lastDeniedSpeakRequestParticipantId, setLastDeniedSpeakRequestParticipantId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const socket = createRoomSocket();
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("room:join", { roomId, participantId });
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("room:joined", (payload) => {
      setRoomState(payload.roomState);
      setEvents((current) => [`You joined room ${payload.roomState.room.code}.`, ...current]);
    });

    socket.on("room:updated", (payload) => {
      setRoomState(payload);
    });

    socket.on("participant:joined", (payload) => {
      setEvents((current) => [`${payload.participant.name} joined.`, ...current]);
    });

    socket.on("participant:left", (payload) => {
      setEvents((current) => [`${payload.participant.name} left.`, ...current]);
    });

    socket.on("participant:updated", (payload) => {
      if (payload.roomState) {
        setRoomState(payload.roomState);
      }
    });

    socket.on("room:readiness-updated", (payload) => {
      setRoomState(payload.roomState);
    });

    socket.on("session:started", (payload) => {
      setRoomState(payload.roomState);
      setEvents((current) => [
        payload.roomState.room.mode === "presentation" ? "Presentation session started." : "Conversation session started.",
        ...current
      ]);
    });

    socket.on("presentation:speak-requested", (payload) => {
      setRoomState(payload.roomState);
      setEvents((current) => [`Speak request received.`, ...current]);
    });

    socket.on("presentation:speak-request-approved", (payload) => {
      setRoomState(payload.roomState);
      setEvents((current) => [`Speak request approved.`, ...current]);
    });

    socket.on("presentation:speak-request-denied", (payload) => {
      setRoomState(payload.roomState);
      setLastDeniedSpeakRequestParticipantId(payload.participantId);
      setEvents((current) => [payload.participantId === participantId ? "Your speak request was denied." : "Speak request denied.", ...current]);
    });

    socket.on("presentation:active-speaker-updated", (payload) => {
      setRoomState(payload.roomState);
      setEvents((current) => ["Active speaker updated.", ...current]);
    });

    socket.on("presentation:translations-delivered", (payload) => {
      setPresentationTranslations((current) => {
        const existingIds = new Set(current.map((item) => item.id));
        const fresh = payload.deliveries.filter((item) => !existingIds.has(item.id));
        return [...fresh, ...current].slice(0, 30);
      });
    });

    socket.on("session:start-failed", (payload) => {
      setError(payload.message);
      setEvents((current) => [`Start failed: ${payload.message}`, ...current]);
    });

    socket.on("error", (payload) => {
      setError(payload.message);
    });

    socket.connect();

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, participantId, roomId]);

  const leaveCurrentRoom = useCallback(() => {
    socketRef.current?.emit("room:leave", { roomId, participantId });
  }, [participantId, roomId]);

  const pushEvent = useCallback((message: string) => {
    setEvents((current) => [message, ...current]);
  }, []);

  const requestToSpeak = useCallback(() => {
    socketRef.current?.emit("presentation:request-to-speak", { roomId, participantId });
  }, [participantId, roomId]);

  const approveSpeakRequest = useCallback(
    (requestingParticipantId: string) => {
      socketRef.current?.emit("presentation:approve-request", {
        roomId,
        hostParticipantId: participantId,
        participantId: requestingParticipantId
      });
    },
    [participantId, roomId]
  );

  const denySpeakRequest = useCallback(
    (requestingParticipantId: string) => {
      socketRef.current?.emit("presentation:deny-request", {
        roomId,
        hostParticipantId: participantId,
        participantId: requestingParticipantId
      });
    },
    [participantId, roomId]
  );

  const releaseFloor = useCallback(() => {
    socketRef.current?.emit("presentation:release-floor", { roomId, participantId });
  }, [participantId, roomId]);

  const submitSpeakerTurn = useCallback(
    (transcriptText: string) => {
      socketRef.current?.emit("presentation:speaker-turn-submitted", {
        roomId,
        participantId,
        transcriptText
      });
    },
    [participantId, roomId]
  );

  const updateRoomState = useCallback((nextRoomState: RoomState) => {
    setRoomState(nextRoomState);
  }, []);

  return {
    connected,
    error,
    events,
    leaveCurrentRoom,
    lastDeniedSpeakRequestParticipantId,
    presentationTranslations,
    pushEvent,
    requestToSpeak,
    roomState,
    approveSpeakRequest,
    denySpeakRequest,
    releaseFloor,
    submitSpeakerTurn,
    updateRoomState
  };
};
