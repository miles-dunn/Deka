"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PresentationTranslationDelivery, RoomState } from "@translator/shared";
import { synthesizeTranslatedVoice } from "../lib/api";
import { useRealtimeConnection } from "../hooks/useRealtimeConnection";
import { ActiveSpeakerBanner } from "./ActiveSpeakerBanner";
import { RealtimeDebugPanel } from "./RealtimeDebugPanel";
import { SpeakRequestList } from "./SpeakRequestList";
import { TranscriptPanel } from "./TranscriptPanel";

interface PresentationRoomViewProps {
  roomState: RoomState;
  participantId: string;
  translations: PresentationTranslationDelivery[];
  lastDeniedSpeakRequestParticipantId: string | null;
  onRequestToSpeak: () => void;
  onApproveSpeakRequest: (participantId: string) => void;
  onDenySpeakRequest: (participantId: string) => void;
  onReleaseFloor: () => void;
  onSpeakerTurnSubmitted: (transcriptText: string) => void;
}

type ListenerPlaybackState = "idle" | "preparing" | "playing" | "ready" | "failed";

export function PresentationRoomView({
  roomState,
  participantId,
  translations,
  lastDeniedSpeakRequestParticipantId,
  onRequestToSpeak,
  onApproveSpeakRequest,
  onDenySpeakRequest,
  onReleaseFloor,
  onSpeakerTurnSubmitted
}: PresentationRoomViewProps) {
  const currentParticipant = roomState.participants.find((participant) => participant.id === participantId);
  const activeSpeaker = roomState.participants.find((participant) => participant.id === roomState.room.activeSpeakerParticipantId);
  const isHost = roomState.room.hostParticipantId === participantId;
  const isActiveSpeaker = roomState.room.activeSpeakerParticipantId === participantId;
  const hasPendingRequest = roomState.room.pendingSpeakRequests.some((request) => request.participantId === participantId);
  const speakerTurnSubmittedRef = useRef<string | null>(null);
  const listenerAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastPlayedDeliveryId = useRef<string | null>(null);
  const [listenerPlaybackState, setListenerPlaybackState] = useState<ListenerPlaybackState>("idle");

  const realtime = useRealtimeConnection({
    roomId: roomState.room.id,
    participantId,
    realtimeSession: roomState.room.realtimeSession,
    roomMode: "presentation",
    targetLanguage: currentParticipant?.targetLanguage ?? "English"
  });

  const ownDeliveries = useMemo(
    () => translations.filter((delivery) => delivery.listenerParticipantId === participantId),
    [participantId, translations]
  );

  const hostVisibleDeliveries = useMemo(() => {
    if (!isHost) {
      return [];
    }

    return translations.slice(0, 12);
  }, [isHost, translations]);

  const latestSpeakerFinal = realtime.transcripts.find((entry) => entry.role === "user" && entry.isFinal);

  useEffect(() => {
    if (!isActiveSpeaker || !latestSpeakerFinal) {
      return;
    }

    if (speakerTurnSubmittedRef.current === latestSpeakerFinal.id) {
      return;
    }

    speakerTurnSubmittedRef.current = latestSpeakerFinal.id;
    onSpeakerTurnSubmitted(latestSpeakerFinal.text);
  }, [isActiveSpeaker, latestSpeakerFinal, onSpeakerTurnSubmitted]);

  useEffect(() => {
    if (isActiveSpeaker || ownDeliveries.length === 0) {
      return;
    }

    const latestDelivery = ownDeliveries[0];
    if (lastPlayedDeliveryId.current === latestDelivery.id) {
      return;
    }

    lastPlayedDeliveryId.current = latestDelivery.id;
    setListenerPlaybackState("preparing");

    synthesizeTranslatedVoice({
      text: latestDelivery.translatedText,
      speakerParticipantId: latestDelivery.speakerParticipantId,
      listenerParticipantId: participantId
    })
      .then((response) => {
        if (response.audioBase64 && response.contentType && listenerAudioRef.current) {
          listenerAudioRef.current.src = `data:${response.contentType};base64,${response.audioBase64}`;
          return listenerAudioRef.current
            .play()
            .then(() => setListenerPlaybackState("playing"))
            .catch(() => setListenerPlaybackState("ready"));
        }

        if ("speechSynthesis" in window) {
          const utterance = new SpeechSynthesisUtterance(latestDelivery.translatedText);
          utterance.onstart = () => setListenerPlaybackState("playing");
          utterance.onend = () => setListenerPlaybackState("ready");
          utterance.onerror = () => setListenerPlaybackState("failed");
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utterance);
          return;
        }

        setListenerPlaybackState("ready");
      })
      .catch(() => setListenerPlaybackState("failed"));
  }, [isActiveSpeaker, ownDeliveries, participantId]);

  const deniedMessage =
    !isActiveSpeaker && !hasPendingRequest && lastDeniedSpeakRequestParticipantId === participantId
      ? "Your last speak request was denied."
      : null;

  return (
    <section className="stack">
      <div className="panel presentation-header">
        <div>
          <p className="eyebrow">Room {roomState.room.code}</p>
          <h1>Presentation mode</h1>
          <p className="lead">One active speaker, moderated floor requests, and listener-specific translated output.</p>
        </div>
        <div className="call-badges">
          <span className={roomState.room.status === "active" ? "voice-status ready" : "voice-status pending"}>{roomState.room.status}</span>
          <span className="voice-status pending">{roomState.participants.length}/{roomState.room.maxParticipants} participants</span>
        </div>
      </div>

      <ActiveSpeakerBanner activeSpeaker={activeSpeaker} isYou={Boolean(activeSpeaker && activeSpeaker.id === participantId)} />

      {isActiveSpeaker ? (
        <div className="panel stack">
          <div className="call-header">
            <div>
              <h2>You are speaking</h2>
              <p className="muted">Hold to speak, release to publish your turn to all listeners.</p>
            </div>
            <div className="button-row compact-actions">
              <button
                className="button secondary"
                type="button"
                onClick={realtime.connect}
                disabled={realtime.connectionState === "connecting" || realtime.connectionState === "connected"}
              >
                {realtime.connectionState === "connecting" ? "Connecting..." : "Connect mic"}
              </button>
              <button className="button warning" type="button" onClick={onReleaseFloor}>
                Release floor
              </button>
            </div>
          </div>

          <TranscriptPanel
            transcripts={realtime.transcripts}
            responseLifecycle={realtime.responseLifecycle}
            speakingTurnState={realtime.speakingTurnState}
            voiceOutputRouting={realtime.voiceOutputRouting}
            voiceRoutingMessage={realtime.voiceRoutingMessage}
            voicePlaybackState="ready"
          />

          <div className="call-controls">
            <button
              className={realtime.speakingTurnState === "speaking" ? "talk-button active" : "talk-button"}
              type="button"
              onPointerDown={() => realtime.startSpeaking()}
              onPointerUp={() => realtime.stopSpeaking()}
              onPointerLeave={() => realtime.stopSpeaking()}
              disabled={realtime.connectionState !== "connected"}
            >
              {realtime.speakingTurnState === "speaking" ? "Release to publish turn" : "Hold to speak"}
            </button>
          </div>

          <RealtimeDebugPanel events={realtime.debugEvents} error={realtime.error} />
        </div>
      ) : (
        <div className="panel stack">
          <div>
            <h2>Listener experience</h2>
            <p className="muted">
              {hasPendingRequest
                ? "Your request is pending host approval."
                : deniedMessage ?? "You are currently listening. Request the floor when you want to speak."}
            </p>
          </div>
          <div className="button-row">
            <button className="button" type="button" onClick={onRequestToSpeak} disabled={hasPendingRequest}>
              {hasPendingRequest ? "Request pending" : "Request to speak"}
            </button>
          </div>
          {deniedMessage ? <div className="error">{deniedMessage}</div> : null}
          <audio ref={listenerAudioRef} className={listenerPlaybackState === "idle" ? "translation-audio hidden" : "translation-audio"} controls />
          <div>
            <h2>Your translated feed</h2>
            <ul className="transcript-list">
              {ownDeliveries.length > 0 ? (
                ownDeliveries.slice(0, 10).map((delivery) => (
                  <li className="transcript-item assistant" key={delivery.id}>
                    <div>
                      <strong>{delivery.targetLanguage}</strong>
                      <span className="muted">{new Date(delivery.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <p>{delivery.translatedText}</p>
                  </li>
                ))
              ) : (
                <li className="transcript-item assistant">
                  <p>Waiting for the active speaker's next turn.</p>
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      <SpeakRequestList
        requests={roomState.room.pendingSpeakRequests}
        participants={roomState.participants}
        isHost={isHost}
        onApprove={onApproveSpeakRequest}
        onDeny={onDenySpeakRequest}
      />

      {isHost && !isActiveSpeaker ? (
        <div className="panel stack">
          <h2>Host monitor</h2>
          <ul className="transcript-list">
            {hostVisibleDeliveries.length > 0 ? (
              hostVisibleDeliveries.map((delivery) => {
                const listener = roomState.participants.find((participant) => participant.id === delivery.listenerParticipantId);
                return (
                  <li className="transcript-item" key={delivery.id}>
                    <div>
                      <strong>{listener?.name ?? "Listener"}</strong>
                      <span className="muted">{delivery.targetLanguage}</span>
                    </div>
                    <p>{delivery.translatedText}</p>
                  </li>
                );
              })
            ) : (
              <li className="transcript-item">
                <p>No translated turns yet.</p>
              </li>
            )}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
