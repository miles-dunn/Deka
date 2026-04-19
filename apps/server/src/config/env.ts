import dotenv from "dotenv";

dotenv.config();

const parsePort = (value: string | undefined) => {
  const port = Number(value ?? 4000);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("PORT must be a positive integer");
  }

  return port;
};

export const env = {
  port: parsePort(process.env.PORT),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:3000",
  nodeEnv: process.env.NODE_ENV ?? "development",
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiRealtimeModel: process.env.OPENAI_REALTIME_MODEL ?? "gpt-realtime",
  openaiRealtimeBootstrapMode: process.env.OPENAI_REALTIME_BOOTSTRAP_MODE ?? "auto",
  elevenLabsApiKey: process.env.ELEVENLABS_API_KEY,
  elevenLabsBootstrapMode: process.env.ELEVENLABS_BOOTSTRAP_MODE ?? "auto",
  elevenLabsTtsModelId: process.env.ELEVENLABS_TTS_MODEL_ID ?? "eleven_flash_v2_5",
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
  firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY,
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL
};
