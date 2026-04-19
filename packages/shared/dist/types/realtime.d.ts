export type RealtimeSessionProvider = "openai" | "openai_mock";
export type RealtimeSessionStatus = "not_connected" | "bootstrapped" | "failed";
export type RealtimeConnectionMode = "webrtc" | "websocket";
export type RealtimeBootstrapMode = "live" | "mock";
export interface RealtimeSessionMetadata {
    id: string;
    provider: RealtimeSessionProvider;
    status: RealtimeSessionStatus;
    createdAt: string;
    expiresAt: string | null;
    connectionStatus: RealtimeSessionStatus;
    connectionMode: RealtimeConnectionMode;
    mode: "realtime";
    roomId: string;
    model: string;
    bootstrapMode: RealtimeBootstrapMode;
    clientSecretExpiresAt: string | null;
    errorMessage?: string;
}
export interface RealtimeConnectionCredentials {
    clientSecret: string;
    realtimeUrl: string | null;
    issuedAt: string;
    expiresAt: string | null;
    bootstrapMode: RealtimeBootstrapMode;
    provider: RealtimeSessionProvider;
    model: string;
}
