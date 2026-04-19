import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@translator/shared";
import { API_BASE_URL } from "./api";

export const createRoomSocket = (): Socket<ServerToClientEvents, ClientToServerEvents> =>
  io(API_BASE_URL, {
    autoConnect: false,
    transports: ["websocket"]
  });
