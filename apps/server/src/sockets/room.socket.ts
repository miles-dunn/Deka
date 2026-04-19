import {
  approvePresentationSpeakRequest,
  confirmParticipantHeadphones,
  connectParticipantSocket,
  denyPresentationSpeakRequest,
  disconnectParticipantSocket,
  leaveRoom,
  releasePresentationFloor,
  requestPresentationSpeak,
  routePresentationTurn,
  startRoomSession
} from "../modules/rooms/room.service";
import { HttpError } from "../utils/httpError";
import type { AppSocket, AppSocketServer } from "../types/socket";
import type { RoomReadiness } from "@translator/shared";

const emitSocketError = (socket: AppSocket, error: unknown) => {
  const message = error instanceof Error ? error.message : "Unexpected socket error";
  const code = error instanceof HttpError ? String(error.statusCode) : "SOCKET_ERROR";

  socket.emit("error", {
    message,
    code
  });
};

const getStartFailureReadiness = (error: unknown): RoomReadiness | undefined => {
  if (!(error instanceof HttpError) || typeof error.details !== "object" || error.details === null || !("readiness" in error.details)) {
    return undefined;
  }

  return (error.details as { readiness?: RoomReadiness }).readiness;
};

export const registerRoomSockets = (io: AppSocketServer) => {
  io.on("connection", (socket) => {
    socket.on("room:join", (payload) => {
      try {
        const session = connectParticipantSocket(payload.roomId, payload.participantId, socket.id);

        socket.join(payload.roomId);
        socket.emit("room:joined", {
          roomState: session.roomState,
          participant: session.participant
        });

        if (session.isFirstConnection) {
          socket.to(payload.roomId).emit("participant:joined", {
            roomId: payload.roomId,
            participant: session.participant
          });
        }

        io.to(payload.roomId).emit("room:updated", session.roomState);
      } catch (error) {
        emitSocketError(socket, error);
      }
    });

    socket.on("room:leave", (payload) => {
      try {
        const result = leaveRoom(payload);

        socket.leave(payload.roomId);
        socket.to(payload.roomId).emit("participant:left", {
          roomId: payload.roomId,
          participant: result.participant
        });
        io.to(payload.roomId).emit("room:updated", result.roomState);
      } catch (error) {
        emitSocketError(socket, error);
      }
    });

    socket.on("participant:confirm-headphones", (payload) => {
      try {
        const response = confirmParticipantHeadphones(payload.roomId, payload.participantId, payload.confirmed ?? true);

        io.to(payload.roomId).emit("participant:updated", {
          roomId: payload.roomId,
          participant: response.participant,
          roomState: response.roomState
        });
        io.to(payload.roomId).emit("room:readiness-updated", {
          roomId: payload.roomId,
          readiness: response.roomState.readiness,
          roomState: response.roomState
        });
        io.to(payload.roomId).emit("room:updated", response.roomState);
      } catch (error) {
        emitSocketError(socket, error);
      }
    });

    socket.on("session:start", async (payload) => {
      try {
        const response = await startRoomSession(payload.roomId, payload.participantId);

        io.to(payload.roomId).emit("session:started", {
          roomId: payload.roomId,
          roomState: response.roomState
        });
        io.to(payload.roomId).emit("room:updated", response.roomState);
      } catch (error) {
        socket.emit("session:start-failed", {
          roomId: payload.roomId,
          message: error instanceof Error ? error.message : "Could not start session",
          readiness: getStartFailureReadiness(error)
        });
      }
    });

    socket.on("presentation:request-to-speak", (payload) => {
      try {
        const response = requestPresentationSpeak(payload.roomId, payload.participantId);

        io.to(payload.roomId).emit("presentation:speak-requested", {
          roomId: payload.roomId,
          request: response.request,
          roomState: response.roomState
        });
        io.to(payload.roomId).emit("room:updated", response.roomState);
      } catch (error) {
        emitSocketError(socket, error);
      }
    });

    socket.on("presentation:approve-request", (payload) => {
      try {
        const response = approvePresentationSpeakRequest(payload.roomId, payload.hostParticipantId, payload.participantId);

        io.to(payload.roomId).emit("presentation:speak-request-approved", {
          roomId: payload.roomId,
          participantId: response.participantId,
          roomState: response.roomState
        });
        io.to(payload.roomId).emit("presentation:active-speaker-updated", {
          roomId: payload.roomId,
          activeSpeakerParticipantId: response.activeSpeakerParticipantId,
          roomState: response.roomState
        });
        io.to(payload.roomId).emit("room:updated", response.roomState);
      } catch (error) {
        emitSocketError(socket, error);
      }
    });

    socket.on("presentation:deny-request", (payload) => {
      try {
        const response = denyPresentationSpeakRequest(payload.roomId, payload.hostParticipantId, payload.participantId);

        io.to(payload.roomId).emit("presentation:speak-request-denied", {
          roomId: payload.roomId,
          participantId: response.participantId,
          roomState: response.roomState
        });
        io.to(payload.roomId).emit("room:updated", response.roomState);
      } catch (error) {
        emitSocketError(socket, error);
      }
    });

    socket.on("presentation:release-floor", (payload) => {
      try {
        const response = releasePresentationFloor(payload.roomId, payload.participantId);

        io.to(payload.roomId).emit("presentation:active-speaker-updated", {
          roomId: payload.roomId,
          activeSpeakerParticipantId: response.activeSpeakerParticipantId,
          roomState: response.roomState
        });
        io.to(payload.roomId).emit("room:updated", response.roomState);
      } catch (error) {
        emitSocketError(socket, error);
      }
    });

    socket.on("presentation:speaker-turn-submitted", async (payload) => {
      try {
        const response = await routePresentationTurn(payload.roomId, payload.participantId, payload.transcriptText);

        io.to(payload.roomId).emit("presentation:translations-delivered", {
          roomId: payload.roomId,
          speakerParticipantId: payload.participantId,
          deliveries: response.deliveries
        });
      } catch (error) {
        emitSocketError(socket, error);
      }
    });

    socket.on("conversation:translation-submitted", (payload) => {
      socket.to(payload.roomId).emit("conversation:translation-delivered", {
        roomId: payload.roomId,
        speakerParticipantId: payload.speakerParticipantId,
        translatedText: payload.translatedText
      });
    });

    socket.on("disconnect", () => {
      const roomState = disconnectParticipantSocket(socket.id);

      if (roomState) {
        socket.to(roomState.room.id).emit("room:updated", roomState);
      }
    });
  });
};
