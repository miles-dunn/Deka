"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeSessionMetadata, RoomMode } from "@translator/shared";
import { getRealtimeCredentials } from "../lib/api";
import { isMockRealtimeCredentials, OPENAI_REALTIME_DATA_CHANNEL, parseRealtimeServerEvent, postRealtimeSdpOffer } from "../lib/realtime";
import type {
  MicPermissionState,
  ParsedRealtimeEvent,
  RealtimeConnectionState,
  RealtimeDebugEvent,
  ResponseLifecycleState,
  SpeakingTurnState,
  TranscriptEntry,
  TranscriptUpdate
} from "../types/realtime";
import type { VoiceOutputRouting } from "@translator/shared";

interface UseRealtimeConnectionParams {
  roomId: string;
  participantId: string;
  realtimeSession: RealtimeSessionMetadata | null;
  roomMode?: RoomMode;
  targetLanguage?: string;
}

const createDebugEvent = (event: Omit<RealtimeDebugEvent, "id" | "timestamp">): RealtimeDebugEvent => ({
  ...event,
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  timestamp: new Date().toLocaleTimeString()
});

export const useRealtimeConnection = ({
  roomId,
  participantId,
  realtimeSession,
  roomMode = "conversation",
  targetLanguage = "the listener's language"
}: UseRealtimeConnectionParams) => {
  const [micPermission, setMicPermission] = useState<MicPermissionState>("unknown");
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>("idle");
  const [responseLifecycle, setResponseLifecycle] = useState<ResponseLifecycleState>("idle");
  const [speakingTurnState, setSpeakingTurnState] = useState<SpeakingTurnState>("idle");
  const [localStreamActive, setLocalStreamActive] = useState(false);
  const [remoteEventStreamActive, setRemoteEventStreamActive] = useState(false);
  const [remoteAudioActive, setRemoteAudioActive] = useState(false);
  const [translatedAudioReceived, setTranslatedAudioReceived] = useState(false);
  const [voiceOutputRouting, setVoiceOutputRouting] = useState<VoiceOutputRouting>("fallback_default");
  const [voiceRoutingMessage, setVoiceRoutingMessage] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugEvents, setDebugEvents] = useState<RealtimeDebugEvent[]>([]);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const mockTimersRef = useRef<number[]>([]);

  const pushDebugEvent = useCallback((event: Omit<RealtimeDebugEvent, "id" | "timestamp">) => {
    setDebugEvents((current) => [createDebugEvent(event), ...current].slice(0, 10));
  }, []);

  const upsertTranscript = useCallback((update: TranscriptUpdate) => {
    if (!update.text) {
      return;
    }

    setTranscripts((current) => {
      const now = new Date().toLocaleTimeString();
      const previous = current[0];
      const normalizedText = update.text.trim().toLowerCase();

      if (
        update.isFinal &&
        current.some(
          (entry) =>
            entry.role === update.role &&
            entry.isFinal &&
            entry.text.trim().toLowerCase() === normalizedText
        )
      ) {
        return current;
      }

      if (previous && previous.role === update.role && !previous.isFinal && !update.isFinal) {
        return [
          {
            ...previous,
            text: `${previous.text}${update.text}`,
            timestamp: now,
            sourceEventType: update.sourceEventType
          },
          ...current.slice(1)
        ];
      }

      if (previous && previous.role === update.role && !previous.isFinal && update.isFinal) {
        return [
          {
            ...previous,
            text: update.text,
            isFinal: true,
            timestamp: now,
            sourceEventType: update.sourceEventType
          },
          ...current.slice(1)
        ];
      }

      return [
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          timestamp: now,
          role: update.role,
          text: update.text,
          isFinal: update.isFinal,
          sourceEventType: update.sourceEventType
        },
        ...current
      ].slice(0, 8);
    });
  }, []);

  const applyParsedEvent = useCallback(
    (parsed: ParsedRealtimeEvent) => {
      if (parsed.lifecycle) {
        setResponseLifecycle(parsed.lifecycle);
      }

      if (parsed.transcript) {
        upsertTranscript(parsed.transcript);
      }

      if (parsed.remoteAudioActive !== undefined) {
        setRemoteAudioActive(parsed.remoteAudioActive);
      }

      if (parsed.translatedAudioReceived) {
        setTranslatedAudioReceived(true);
      }

      if (parsed.errorMessage) {
        setError(parsed.errorMessage);
      }
    },
    [upsertTranscript]
  );

  const handleRealtimePayload = useCallback(
    (payload: unknown) => {
      const parsed = parseRealtimeServerEvent(payload);
      applyParsedEvent(parsed);
      pushDebugEvent({
        direction: parsed.errorMessage ? "error" : "incoming",
        type: parsed.type,
        detail: JSON.stringify(payload).slice(0, 280)
      });
    },
    [applyParsedEvent, pushDebugEvent]
  );

  const sendClientEvent = useCallback(
    (event: Record<string, unknown>) => {
      const dataChannel = dataChannelRef.current;

      if (!dataChannel || dataChannel.readyState !== "open") {
        pushDebugEvent({ direction: "error", type: "client_event.not_sent", detail: "Realtime data channel is not open." });
        return false;
      }

      dataChannel.send(JSON.stringify(event));
      pushDebugEvent({ direction: "outgoing", type: String(event.type ?? "client_event"), detail: JSON.stringify(event).slice(0, 220) });
      return true;
    },
    [pushDebugEvent]
  );

  const cleanup = useCallback(() => {
    mockTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    mockTimersRef.current = [];
    dataChannelRef.current?.close();
    peerConnectionRef.current?.close();
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    dataChannelRef.current = null;
    peerConnectionRef.current = null;
    localStreamRef.current = null;
    setLocalStreamActive(false);
    setRemoteEventStreamActive(false);
    setRemoteAudioActive(false);
    setTranslatedAudioReceived(false);
    setSpeakingTurnState("idle");
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const requestMicrophone = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      setMicPermission("granted");
      setLocalStreamActive(true);
      stream.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });
      setMuted(true);
      pushDebugEvent({ direction: "state", type: "microphone.granted", detail: "Local microphone stream is active." });
      return stream;
    } catch (caughtError) {
      setMicPermission("denied");
      const message = caughtError instanceof Error ? caughtError.message : "Microphone permission denied";
      pushDebugEvent({ direction: "error", type: "microphone.denied", detail: message });
      throw new Error(message);
    }
  }, [pushDebugEvent]);

  const connectMockRealtime = useCallback(
    async (stream: MediaStream) => {
      setConnectionState("connecting");
      pushDebugEvent({ direction: "state", type: "mock.connecting", detail: "Using local mock Realtime transport." });
      stream.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });

      const connectedTimer = window.setTimeout(() => {
        setConnectionState("connected");
        setRemoteEventStreamActive(true);
        handleRealtimePayload({ type: "session.created", session: { id: "mock-session" } });
      }, 500);

      const speechTimer = window.setTimeout(() => {
        handleRealtimePayload({ type: "input_audio_buffer.speech_started", item_id: "mock-input" });
      }, 1400);

      mockTimersRef.current = [connectedTimer, speechTimer];
    },
    [handleRealtimePayload, pushDebugEvent]
  );

  const connectLiveRealtime = useCallback(
    async (stream: MediaStream) => {
      const credentialsResponse = await getRealtimeCredentials(roomId, { participantId });
      const { credentials } = credentialsResponse;

      if (isMockRealtimeCredentials(credentials)) {
        await connectMockRealtime(stream);
        return;
      }

      setConnectionState("connecting");
      pushDebugEvent({ direction: "state", type: "webrtc.connecting", detail: `Connecting to ${credentials.model}.` });

      const peerConnection = new RTCPeerConnection();
      peerConnectionRef.current = peerConnection;

      peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState;
        pushDebugEvent({ direction: "state", type: "peer.connection_state", detail: state });

        if (state === "connected") {
          setConnectionState("connected");
        }

        if (state === "failed" || state === "disconnected") {
          setConnectionState("failed");
        }

        if (state === "closed") {
          setConnectionState("closed");
        }
      };

      peerConnection.ontrack = () => {
        setRemoteAudioActive(false);
        pushDebugEvent({ direction: "incoming", type: "remote.track.ignored", detail: "OpenAI audio track ignored; ElevenLabs handles playback." });
      };

      for (const track of stream.getAudioTracks()) {
        peerConnection.addTrack(track, stream);
      }

      const dataChannel = peerConnection.createDataChannel(OPENAI_REALTIME_DATA_CHANNEL);
      dataChannelRef.current = dataChannel;

      dataChannel.addEventListener("open", () => {
        setRemoteEventStreamActive(true);
        const translationInstruction =
          roomMode === "presentation"
            ? `Transcribe and translate the active speaker into ${targetLanguage}. Keep the translation concise and natural. Return text only.`
            : `Translate the speaker's speech into ${targetLanguage}. Return only the translated text. Do not repeat the original speech and do not produce audio.`;

        sendClientEvent({
          type: "session.update",
          session: {
            output_modalities: ["text"],
            modalities: ["text"],
            instructions: translationInstruction
          }
        });
        pushDebugEvent({ direction: "state", type: "data_channel.open", detail: OPENAI_REALTIME_DATA_CHANNEL });
      });

      dataChannel.addEventListener("message", (event) => {
        try {
          const payload = JSON.parse(event.data);
          handleRealtimePayload(payload);
        } catch {
          pushDebugEvent({ direction: "incoming", type: "realtime.raw", detail: String(event.data).slice(0, 280) });
        }
      });

      dataChannel.addEventListener("close", () => {
        setRemoteEventStreamActive(false);
        pushDebugEvent({ direction: "state", type: "data_channel.closed" });
      });

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      if (!offer.sdp) {
        throw new Error("WebRTC offer did not include SDP");
      }

      const answerSdp = await postRealtimeSdpOffer(credentials, offer.sdp);
      await peerConnection.setRemoteDescription({ type: "answer", sdp: answerSdp });
      pushDebugEvent({ direction: "state", type: "webrtc.answer_set", detail: "Remote SDP answer applied." });
    },
    [connectMockRealtime, handleRealtimePayload, participantId, pushDebugEvent, roomId, roomMode, sendClientEvent, targetLanguage]
  );

  const connect = useCallback(async () => {
    if (!realtimeSession || realtimeSession.status !== "bootstrapped") {
      setError("Realtime session is not bootstrapped yet.");
      return;
    }

    cleanup();
    setError(null);
    setResponseLifecycle("idle");
    setTranslatedAudioReceived(false);
    setConnectionState("connecting");

    try {
      const stream = await requestMicrophone();
      await connectLiveRealtime(stream);
    } catch (caughtError) {
      cleanup();
      const message = caughtError instanceof Error ? caughtError.message : "Realtime connection failed";
      setError(message);
      setConnectionState("failed");
      pushDebugEvent({ direction: "error", type: "realtime.failed", detail: message });
    }
  }, [cleanup, connectLiveRealtime, pushDebugEvent, realtimeSession, requestMicrophone]);

  const disconnect = useCallback(() => {
    cleanup();
    setConnectionState("closed");
    setResponseLifecycle("idle");
    pushDebugEvent({ direction: "state", type: "realtime.closed", detail: "Realtime connection closed locally." });
  }, [cleanup, pushDebugEvent]);

  const toggleMute = useCallback(() => {
    const nextMuted = !muted;
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setMuted(nextMuted);
    pushDebugEvent({ direction: "state", type: nextMuted ? "microphone.muted" : "microphone.unmuted" });
  }, [muted, pushDebugEvent]);

  const setVoiceRouting = useCallback(
    (routing: VoiceOutputRouting, message?: string) => {
      setVoiceOutputRouting(routing);
      setVoiceRoutingMessage(
        routing === "cloned_voice" ? "Translated output routed through cloned voice." : message ?? "Using fallback/default voice output."
      );
      pushDebugEvent({ direction: "state", type: "voice.routing", detail: routing });
    },
    [pushDebugEvent]
  );

  const startSpeaking = useCallback(() => {
    if (!localStreamRef.current || connectionState !== "connected") {
      pushDebugEvent({ direction: "error", type: "speaking.not_ready", detail: "Connect Realtime before starting a turn." });
      return;
    }

    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = true;
    });
    if (dataChannelRef.current?.readyState === "open") {
      sendClientEvent({ type: "input_audio_buffer.clear" });
    }
    setMuted(false);
    setSpeakingTurnState("speaking");
    setResponseLifecycle("listening");
    setTranslatedAudioReceived(false);
    pushDebugEvent({ direction: "state", type: "speaking.started", detail: "Local mic track enabled for this turn." });
  }, [connectionState, pushDebugEvent, sendClientEvent]);

  const stopSpeaking = useCallback(() => {
    if (speakingTurnState !== "speaking") {
      return;
    }

    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = false;
    });
    setMuted(true);
    setSpeakingTurnState("stopped");
    setResponseLifecycle("processing");
    pushDebugEvent({ direction: "state", type: "speaking.stopped", detail: "Local mic track disabled for this turn." });

    if (dataChannelRef.current?.readyState === "open") {
      sendClientEvent({ type: "input_audio_buffer.commit" });
      sendClientEvent({
        type: "response.create",
        response: {
          modalities: ["text"],
          instructions: "Translate the committed speech now. Return only the translated text."
        }
      });
      return;
    }

    const speechStoppedTimer = window.setTimeout(() => {
      handleRealtimePayload({ type: "input_audio_buffer.speech_stopped", item_id: "mock-input" });
      handleRealtimePayload({
        type: "conversation.item.input_audio_transcription.completed",
        item_id: "mock-input",
        transcript: "Hello, can you translate this?"
      });
      handleRealtimePayload({ type: "response.created", response: { id: "mock-response", status: "in_progress" } });
      handleRealtimePayload({ type: "response.output_text.delta", response_id: "mock-response", delta: "Hola, " });
    }, 300);

    const responseDoneTimer = window.setTimeout(() => {
      handleRealtimePayload({
        type: "response.output_text.done",
        response_id: "mock-response",
        text: "Hola, puedes traducir esto?"
      });
      handleRealtimePayload({ type: "response.done", response: { id: "mock-response", status: "completed" } });
    }, 1000);

    mockTimersRef.current = [...mockTimersRef.current, speechStoppedTimer, responseDoneTimer];
  }, [handleRealtimePayload, pushDebugEvent, sendClientEvent, speakingTurnState]);

  const toggleSpeaking = useCallback(() => {
    if (speakingTurnState === "speaking") {
      stopSpeaking();
      return;
    }

    startSpeaking();
  }, [speakingTurnState, startSpeaking, stopSpeaking]);

  return {
    connect,
    connectionState,
    debugEvents,
    disconnect,
    error,
    localStreamActive,
    micPermission,
    muted,
    remoteAudioActive,
    remoteEventStreamActive,
    responseLifecycle,
    setVoiceRouting,
    speakingTurnState,
    startSpeaking,
    stopSpeaking,
    toggleMute,
    toggleSpeaking,
    transcripts,
    translatedAudioReceived,
    voiceOutputRouting,
    voiceRoutingMessage
  };
};
