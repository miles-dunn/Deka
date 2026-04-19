"use client";

import { useEffect, useRef, useState } from "react";
import type { ConversationTranslationDeliveredSocketPayload, RoomState } from "@translator/shared";
import { synthesizeTranslatedVoice } from "../lib/api";
import { useRealtimeConnection } from "../hooks/useRealtimeConnection";
import { RealtimeDebugPanel } from "./RealtimeDebugPanel";
import { TranscriptPanel } from "./TranscriptPanel";

interface SessionActivePlaceholderProps {
  roomState: RoomState;
  participantId: string;
  conversationTranslations: ConversationTranslationDeliveredSocketPayload[];
  onTranslationReady: (translatedText: string) => void;
}

type VoicePlaybackState = "idle" | "preparing" | "playing" | "ready" | "fallback_playing" | "failed";

export function SessionActivePlaceholder({ roomState, participantId, conversationTranslations, onTranslationReady }: SessionActivePlaceholderProps) {
  const realtimeSession = roomState.room.realtimeSession;
  const shellState = realtimeSession?.status ?? "not_connected";
  const pointerTurnStarted = useRef(false);
  const clonedAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastSynthesizedTranscriptId = useRef<string | null>(null);
  const [voicePlaybackState, setVoicePlaybackState] = useState<VoicePlaybackState>("idle");
  const realtime = useRealtimeConnection({
    roomId: roomState.room.id,
    participantId,
    realtimeSession,
    roomMode: "conversation",
    targetLanguage: roomState.participants.find((participant) => participant.id === participantId)?.targetLanguage ?? "the listener's language"
  });
  const latestAssistantFinal = realtime.transcripts.find((entry) => entry.role === "assistant" && entry.isFinal);
  const isConnected = realtime.connectionState === "connected";
  const isSpeaking = realtime.speakingTurnState === "speaking";

  // Auto-connect as soon as the realtime session is ready
  useEffect(() => {
    if (realtimeSession?.status === "bootstrapped" && realtime.connectionState === "idle") {
      realtime.connect();
    }
  }, [realtimeSession?.status, realtime.connectionState, realtime.connect]);

  // When our own translation is ready, send it to listeners via socket
  useEffect(() => {
    if (!latestAssistantFinal || latestAssistantFinal.id === lastSynthesizedTranscriptId.current) {
      return;
    }
    lastSynthesizedTranscriptId.current = latestAssistantFinal.id;
    onTranslationReady(latestAssistantFinal.text);
  }, [latestAssistantFinal, onTranslationReady]);

  // When we receive a translation from another speaker, synthesize and play it
  const lastReceivedTranslation = conversationTranslations[0];
  const lastReceivedTranslationRef = useRef<string | null>(null);
  useEffect(() => {
    if (!lastReceivedTranslation || lastReceivedTranslation.translatedText === lastReceivedTranslationRef.current) {
      return;
    }
    lastReceivedTranslationRef.current = lastReceivedTranslation.translatedText;
    setVoicePlaybackState("preparing");

    synthesizeTranslatedVoice({
      text: lastReceivedTranslation.translatedText,
      speakerParticipantId: lastReceivedTranslation.speakerParticipantId
    })
      .then((response) => {
        realtime.setVoiceRouting(response.outputRouting, response.fallbackReason);

        if (response.audioBase64 && response.contentType && clonedAudioRef.current) {
          clonedAudioRef.current.src = `data:${response.contentType};base64,${response.audioBase64}`;
          void clonedAudioRef.current
            .play()
            .then(() => setVoicePlaybackState("playing"))
            .catch(() => setVoicePlaybackState("ready"));
          return;
        }

        if ("speechSynthesis" in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(lastReceivedTranslation.translatedText);
          utterance.onstart = () => setVoicePlaybackState("fallback_playing");
          utterance.onend = () => setVoicePlaybackState("ready");
          utterance.onerror = () => setVoicePlaybackState("failed");
          window.speechSynthesis.speak(utterance);
          return;
        }

        setVoicePlaybackState("failed");
      })
      .catch((caughtError) => {
        setVoicePlaybackState("failed");
        realtime.setVoiceRouting("fallback_default", caughtError instanceof Error ? caughtError.message : "ElevenLabs playback failed");
      });
  }, [lastReceivedTranslation, realtime.setVoiceRouting]);

  const voiceBadgeText =
    voicePlaybackState === "playing"
      ? "playing cloned voice"
      : voicePlaybackState === "preparing"
        ? "preparing voice"
        : voicePlaybackState === "fallback_playing"
          ? "playing fallback voice"
          : realtime.voiceOutputRouting === "cloned_voice"
            ? "cloned voice ready"
            : "voice ready";

  const voiceBadgeClass = voicePlaybackState === "failed" ? "voice-status missing" : voicePlaybackState === "idle" ? "voice-status pending" : "voice-status ready";

  return (
    <div className="panel active-session call-shell">
      <div className="call-header">
        <div>
          <p className="eyebrow">Room {roomState.room.code}</p>
          <h1>Conversation active</h1>
        </div>
        <div className="call-badges">
          <span className={isConnected ? "voice-status ready" : "voice-status pending"}>{isConnected ? "connected" : shellState}</span>
          <span className={voiceBadgeClass}>{voiceBadgeText}</span>
        </div>
      </div>

      {realtimeSession?.errorMessage ? <div className="error">{realtimeSession.errorMessage}</div> : null}

      <TranscriptPanel
        transcripts={realtime.transcripts}
        responseLifecycle={realtime.responseLifecycle}
        speakingTurnState={realtime.speakingTurnState}
        voiceOutputRouting={realtime.voiceOutputRouting}
        voiceRoutingMessage={realtime.voiceRoutingMessage}
        voicePlaybackState={voicePlaybackState}
      />

      <div className="call-controls">
        <button
          className={isSpeaking ? "talk-button active" : "talk-button"}
          type="button"
          onPointerDown={() => {
            if (isConnected && !isSpeaking) {
              pointerTurnStarted.current = true;
              realtime.startSpeaking();
            }
          }}
          onPointerUp={() => {
            if (pointerTurnStarted.current) {
              pointerTurnStarted.current = false;
              realtime.stopSpeaking();
            }
          }}
          onPointerLeave={() => {
            if (pointerTurnStarted.current) {
              pointerTurnStarted.current = false;
              realtime.stopSpeaking();
            }
          }}
          onKeyDown={(event) => {
            if ((event.key === " " || event.key === "Enter") && isConnected && !isSpeaking) {
              event.preventDefault();
              realtime.startSpeaking();
            }
          }}
          onKeyUp={(event) => {
            if ((event.key === " " || event.key === "Enter") && isSpeaking) {
              event.preventDefault();
              realtime.stopSpeaking();
            }
          }}
          disabled={!isConnected}
        >
          {isSpeaking ? "Release to translate" : isConnected ? "Hold to speak" : "Connect to speak"}
        </button>
        <p className="muted">
          {realtime.responseLifecycle === "processing"
            ? "Processing your turn..."
            : realtime.responseLifecycle === "responding"
              ? "Translating..."
              : realtime.voiceRoutingMessage ?? "Hold to speak, release to translate."}
        </p>
      </div>

      <audio
        ref={clonedAudioRef}
        className={voicePlaybackState === "ready" || voicePlaybackState === "playing" ? "translation-audio" : "translation-audio hidden"}
        controls
        onEnded={() => setVoicePlaybackState("ready")}
        onPlay={() => setVoicePlaybackState("playing")}
      />

      <div className="call-secondary">
        <div className="button-row compact-actions">
          <button className="button secondary" type="button" onClick={realtime.toggleMute} disabled={!realtime.localStreamActive}>
            {realtime.muted ? "Unmute" : "Mute"}
          </button>
          <button className="button warning" type="button" onClick={realtime.disconnect} disabled={realtime.connectionState === "idle" || realtime.connectionState === "closed"}>
            Disconnect
          </button>
        </div>
      </div>

      <RealtimeDebugPanel events={realtime.debugEvents} error={realtime.error} />
    </div>
  );
}
