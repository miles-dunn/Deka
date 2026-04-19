import { createServer } from "node:http";
import { Server } from "socket.io";
import { createApp } from "./app";
import { env } from "./config/env";
import { registerRoomSockets } from "./sockets/room.socket";
import type { ClientToServerEvents, ServerToClientEvents } from "@translator/shared";

const httpServer = createServer();
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: env.clientOrigin,
    methods: ["GET", "POST"]
  }
});

const app = createApp(io);

httpServer.on("request", app);
registerRoomSockets(io);

httpServer.listen(env.port, () => {
  console.log(`Translator server listening on http://localhost:${env.port}`);
});
