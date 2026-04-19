# Translator AI MVP

Segment 1 builds the backend foundation and a minimal web client scaffold for room and participant state.

This segment intentionally does not implement translation, audio streaming, WebRTC, OpenAI Realtime, or ElevenLabs.

## Workspaces

- `apps/server` - Express and Socket.IO backend
- `apps/web` - Next.js App Router client
- `packages/shared` - shared TypeScript types and constants

## Local Development

Install dependencies:

```bash
npm install
```

Run the backend:

```bash
npm run dev:server
```

Run the web app in a second terminal:

```bash
npm run dev:web
```
```bash
npm install -D @tailwindcss/postcss 
```

Defaults:

- Web: `http://localhost:3000`
- API and Socket.IO: `http://localhost:4000`

## Voice Samples

Segment 2 adds local voice sample upload scaffolding:

- `POST /api/voices/upload` accepts `multipart/form-data` with `audio`, `roomId`, and `participantId`.
- `GET /api/voices/:participantId` returns the participant's in-memory voice profile metadata.
- Uploaded samples are stored locally under `apps/server/temp/uploads`.

ElevenLabs clone creation is intentionally left as a TODO extension point.

## Readiness And Session Start

Segment 3 adds pre-call readiness gating:

- `PATCH /api/participants/:participantId/headphones` confirms headphones for a participant.
- `POST /api/rooms/:roomId/start` starts the conversation only when both participants are connected, have language selections, uploaded voice samples, and confirmed headphones.
- `GET /api/rooms/:roomId` returns room readiness details in `roomState.readiness`.

OpenAI Realtime session bootstrap is now wired as metadata only; live audio transport remains a TODO extension point.

## OpenAI Realtime Bootstrap

Segment 4 adds Realtime session metadata creation during room start:

- `POST /api/rooms/:roomId/start` now bootstraps Realtime metadata after readiness passes.
- `GET /api/rooms/:roomId/session` returns the current room Realtime metadata.
- Without `OPENAI_API_KEY`, the server uses a local mock adapter for development.
- With `OPENAI_API_KEY`, the server calls OpenAI's Realtime client secret endpoint.

Live microphone capture, WebRTC offer/answer, and audio transport are intentionally left as TODO extension points.

## Browser Realtime WebRTC Shell

Segment 5 adds the browser transport shell:

- `POST /api/rooms/:roomId/realtime-credentials` returns client-safe Realtime credentials for an active room participant.
- The active session UI can request microphone permission with `getUserMedia`.
- The browser creates a `RTCPeerConnection`, attaches the local microphone track, opens an `oai-events` data channel, and exchanges SDP with OpenAI when live credentials are available.
- Mock mode simulates connection and debug events without an OpenAI key.

ElevenLabs, final translated playback, transcripts, and polished audio routing are intentionally left for later segments.

## Realtime Event Parsing

Segment 6 adds the conversation shell on top of the Realtime transport:

- Incoming `oai-events` messages are parsed into lifecycle, transcript, and audio-output state.
- The active session UI shows local speech transcript, translated/assistant transcript, response lifecycle, and remote audio status.
- `Start speaking` and `Stop speaking` provide a simple one-speaker-at-a-time MVP flow by enabling/disabling the local mic track.
- Mock mode emits representative Realtime events so transcript/debug UI can be tested without OpenAI credentials.

ElevenLabs voice routing and polished translated playback remain TODOs.

## ElevenLabs Voice Cloning

Segment 7 adds ElevenLabs clone/status scaffolding:

- `POST /api/voices/:participantId/clone` creates or starts a voice clone from the uploaded sample.
- `GET /api/voices/:participantId/clone-status` returns clone readiness and routing state.
- `POST /api/voices/tts` attempts cloned-voice speech for translated text and falls back when cloning or ElevenLabs is unavailable.
- Without `ELEVENLABS_API_KEY`, the server uses mock clone creation and default/fallback audio routing.

Low-latency ElevenLabs streaming, durable job storage, and production voice routing remain TODOs.
