import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { validateCreateRoomRequest, validateJoinRoomRequest, validateLeaveRoomRequest } from "../utils/validation";
import {
  approvePresentationSpeakRequest,
  createRoom,
  denyPresentationSpeakRequest,
  getRealtimeConnectionCredentials,
  getRoomRealtimeSession,
  getRoomState,
  joinRoom,
  leaveRoom,
  releasePresentationFloor,
  requestPresentationSpeak,
  startRoomSession
} from "../modules/rooms/room.service";
import { HttpError } from "../utils/httpError";
import { authMiddleware, type AuthenticatedRequest } from "../middleware/authMiddleware";
import type { AppSocketServer } from "../types/socket";

export const createRoomRouter = (io: AppSocketServer) => {
  const router = Router();

  router.post(
    "/create",
    authMiddleware,
    asyncHandler((req: AuthenticatedRequest, res) => {
      const input = validateCreateRoomRequest(req.body);
      const session = createRoom(input, req.user?.uid);

      res.status(201).json(session);
    })
  );

  router.post(
    "/join",
    authMiddleware,
    asyncHandler((req: AuthenticatedRequest, res) => {
      const input = validateJoinRoomRequest(req.body);
      const session = joinRoom(input, req.user?.uid);

      io.to(session.roomState.room.id).emit("participant:joined", {
        roomId: session.roomState.room.id,
        participant: session.participant
      });
      io.to(session.roomState.room.id).emit("room:updated", session.roomState);

      res.status(200).json(session);
    })
  );

  router.post(
    "/leave",
    authMiddleware,
    asyncHandler((req: AuthenticatedRequest, res) => {
      const input = validateLeaveRoomRequest(req.body);
      const result = leaveRoom(input);

      if (result.participant.socketId) {
        io.sockets.sockets.get(result.participant.socketId)?.leave(result.roomId);
      }

      io.to(result.roomId).emit("participant:left", {
        roomId: result.roomId,
        participant: result.participant
      });
      io.to(result.roomId).emit("room:updated", result.roomState);

      res.status(200).json(result.roomState);
    })
  );

  router.post(
    "/:roomId/start",
    authMiddleware,
    asyncHandler(async (req: AuthenticatedRequest, res) => {
      const { roomId } = req.params as { roomId: string };
      const participantId = typeof req.body.participantId === "string" ? req.body.participantId.trim() : "";

      if (!participantId) {
        throw new HttpError(400, "participantId is required");
      }

      const response = await startRoomSession(roomId, participantId);

      io.to(roomId).emit("session:started", {
        roomId,
        roomState: response.roomState
      });
      io.to(roomId).emit("room:updated", response.roomState);

      res.status(200).json(response);
    })
  );

  router.post(
    "/:roomId/presentation/request-to-speak",
    authMiddleware,
    asyncHandler((req: AuthenticatedRequest, res) => {
      const { roomId } = req.params as { roomId: string };
      const participantId = typeof req.body.participantId === "string" ? req.body.participantId.trim() : "";

      if (!participantId) {
        throw new HttpError(400, "participantId is required");
      }

      const response = requestPresentationSpeak(roomId, participantId);

      io.to(roomId).emit("presentation:speak-requested", {
        roomId,
        request: response.request,
        roomState: response.roomState
      });
      io.to(roomId).emit("room:updated", response.roomState);

      res.status(200).json(response);
    })
  );

  router.post(
    "/:roomId/presentation/approve-request",
    authMiddleware,
    asyncHandler((req: AuthenticatedRequest, res) => {
      const { roomId } = req.params as { roomId: string };
      const hostParticipantId = typeof req.body.hostParticipantId === "string" ? req.body.hostParticipantId.trim() : "";
      const participantId = typeof req.body.participantId === "string" ? req.body.participantId.trim() : "";

      if (!hostParticipantId || !participantId) {
        throw new HttpError(400, "hostParticipantId and participantId are required");
      }

      const response = approvePresentationSpeakRequest(roomId, hostParticipantId, participantId);

      io.to(roomId).emit("presentation:speak-request-approved", {
        roomId,
        participantId: response.participantId,
        roomState: response.roomState
      });
      io.to(roomId).emit("presentation:active-speaker-updated", {
        roomId,
        activeSpeakerParticipantId: response.activeSpeakerParticipantId,
        roomState: response.roomState
      });
      io.to(roomId).emit("room:updated", response.roomState);

      res.status(200).json(response);
    })
  );

  router.post(
    "/:roomId/presentation/deny-request",
    authMiddleware,
    asyncHandler((req: AuthenticatedRequest, res) => {
      const { roomId } = req.params as { roomId: string };
      const hostParticipantId = typeof req.body.hostParticipantId === "string" ? req.body.hostParticipantId.trim() : "";
      const participantId = typeof req.body.participantId === "string" ? req.body.participantId.trim() : "";

      if (!hostParticipantId || !participantId) {
        throw new HttpError(400, "hostParticipantId and participantId are required");
      }

      const response = denyPresentationSpeakRequest(roomId, hostParticipantId, participantId);

      io.to(roomId).emit("presentation:speak-request-denied", {
        roomId,
        participantId: response.participantId,
        roomState: response.roomState
      });
      io.to(roomId).emit("room:updated", response.roomState);

      res.status(200).json(response);
    })
  );

  router.post(
    "/:roomId/presentation/release-floor",
    authMiddleware,
    asyncHandler((req: AuthenticatedRequest, res) => {
      const { roomId } = req.params as { roomId: string };
      const participantId = typeof req.body.participantId === "string" ? req.body.participantId.trim() : "";

      if (!participantId) {
        throw new HttpError(400, "participantId is required");
      }

      const response = releasePresentationFloor(roomId, participantId);

      io.to(roomId).emit("presentation:active-speaker-updated", {
        roomId,
        activeSpeakerParticipantId: response.activeSpeakerParticipantId,
        roomState: response.roomState
      });
      io.to(roomId).emit("room:updated", response.roomState);

      res.status(200).json(response);
    })
  );

  router.get(
    "/:roomId/session",
    authMiddleware,
    asyncHandler((req: AuthenticatedRequest, res) => {
      const { roomId } = req.params as { roomId: string };

      res.status(200).json(getRoomRealtimeSession(roomId));
    })
  );

  router.post(
    "/:roomId/realtime-credentials",
    authMiddleware,
    asyncHandler(async (req: AuthenticatedRequest, res) => {
      const { roomId } = req.params as { roomId: string };
      const participantId = typeof req.body.participantId === "string" ? req.body.participantId.trim() : "";

      if (!participantId) {
        throw new HttpError(400, "participantId is required");
      }

      res.status(200).json(await getRealtimeConnectionCredentials(roomId, participantId));
    })
  );

  router.get(
    "/:roomId",
    authMiddleware,
    asyncHandler((req: AuthenticatedRequest, res) => {
      const { roomId } = req.params as { roomId: string };

      res.status(200).json(getRoomState(roomId));
    })
  );

  return router;
};
