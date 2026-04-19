import { Router } from "express";
import { confirmParticipantHeadphones } from "../modules/rooms/room.service";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../utils/httpError";
import type { AppSocketServer } from "../types/socket";

export const createParticipantRouter = (io: AppSocketServer) => {
  const router = Router();

  router.patch(
    "/:participantId/headphones",
    asyncHandler((req, res) => {
      const { participantId } = req.params as { participantId: string };
      const roomId = typeof req.body.roomId === "string" ? req.body.roomId.trim() : "";
      const confirmed = req.body.confirmed === undefined ? true : Boolean(req.body.confirmed);

      if (!roomId) {
        throw new HttpError(400, "roomId is required");
      }

      const response = confirmParticipantHeadphones(roomId, participantId, confirmed);

      io.to(roomId).emit("participant:updated", {
        roomId,
        participant: response.participant,
        roomState: response.roomState
      });
      io.to(roomId).emit("room:readiness-updated", {
        roomId,
        readiness: response.roomState.readiness,
        roomState: response.roomState
      });
      io.to(roomId).emit("room:updated", response.roomState);

      res.status(200).json(response);
    })
  );

  return router;
};
