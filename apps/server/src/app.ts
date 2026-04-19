import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { healthRouter } from "./routes/health.routes";
import { createParticipantRouter } from "./routes/participant.routes";
import { createRoomRouter } from "./routes/room.routes";
import { createVoiceRouter } from "./routes/voice.routes";
import type { AppSocketServer } from "./types/socket";

export const createApp = (io: AppSocketServer) => {
  const app = express();

  app.use(
    cors({
      origin: env.clientOrigin
    })
  );
  app.use(express.json({ limit: "1mb" }));

  app.use("/api/health", healthRouter);
  app.use("/api/participants", createParticipantRouter(io));
  app.use("/api/rooms", createRoomRouter(io));
  app.use("/api/voices", createVoiceRouter(io));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
