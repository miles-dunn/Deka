"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { confirmHeadphones, getRoom, leaveRoom, startSession } from "../lib/api";
import { clearRoomSession } from "../lib/session";
import { useRoomSocket } from "../hooks/useRoomSocket";
import { useAuth } from "../hooks/useAuth";
import { uploadVoiceSampleFromUrl } from "../lib/upload";
import { assignProfileClone } from "../lib/api";
import { ReadinessChecklist } from "./ReadinessChecklist";
import { RoomReadinessPanel } from "./RoomReadinessPanel";
import { RoomStatusPanel } from "./RoomStatusPanel";
import { SessionActivePlaceholder } from "./SessionActivePlaceholder";
import { PresentationRoomView } from "./PresentationRoomView";
import { VoiceCloneStatus } from "./VoiceCloneStatus";
import { VoiceSampleUploader } from "./VoiceSampleUploader";

interface WaitingRoomClientProps {
  roomId: string;
  participantId: string;
}

type AutoUploadState = "idle" | "uploading" | "done" | "failed";

export function WaitingRoomClient({ roomId, participantId }: WaitingRoomClientProps) {
  const router = useRouter();
  const { profile } = useAuth();
  const [initialError, setInitialError] = useState<string | null>(null);
  const [autoUpload, setAutoUpload] = useState<AutoUploadState>("idle");
  const [autoUploadError, setAutoUploadError] = useState<string | null>(null);
  const autoUploadAttempted = useRef(false);
  const autoHeadphoneConfirmAttempted = useRef(false);
  const autoStartAttempted = useRef(false);
  const hasSession = Boolean(roomId && participantId);
  const {
    connected,
    error,
    events,
    leaveCurrentRoom,
    pushEvent,
    roomState,
    updateRoomState,
    presentationTranslations,
    lastDeniedSpeakRequestParticipantId,
    requestToSpeak,
    approveSpeakRequest,
    denySpeakRequest,
    releaseFloor,
    submitSpeakerTurn
  } = useRoomSocket({
    roomId,
    participantId,
    enabled: hasSession
  });

  useEffect(() => {
    if (!hasSession) {
      return;
    }

    getRoom(roomId)
      .then(updateRoomState)
      .catch((caughtError) => {
        setInitialError(caughtError instanceof Error ? caughtError.message : "Could not load room");
      });
  }, [hasSession, roomId, updateRoomState]);

  // Auto-upload saved voice sample from user profile when entering a room
  useEffect(() => {
    const voiceSampleUrl = profile?.voiceSampleUrl;
    if (!roomState || !voiceSampleUrl || autoUploadAttempted.current) return;
    const myParticipant = roomState.participants.find((p) => p.id === participantId);
    if (myParticipant?.voiceProfileId) return;

    autoUploadAttempted.current = true;
    setAutoUpload("uploading");
    setAutoUploadError(null);

    // Server fetches the audio from Firebase Storage URL — no client-side CORS issues
    uploadVoiceSampleFromUrl({ roomId, participantId, voiceSampleUrl, durationSeconds: profile.voiceSampleDuration })
      .then(async (response) => {
        updateRoomState(response.roomState);
        pushEvent("Voice sample applied from your profile.");
        if (profile.voiceCloneId) {
          try {
            await assignProfileClone(participantId, {
              providerVoiceId: profile.voiceCloneId,
              provider: profile.voiceCloneProvider ?? "elevenlabs",
            });
            pushEvent("Voice clone assigned from your profile.");
          } catch {
            // Non-critical — shown in VoiceCloneStatus panel
          }
        }
        setAutoUpload("done");
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        setAutoUploadError(`Could not apply saved voice sample: ${msg}`);
        setAutoUpload("failed");
      });
  }, [roomState, profile, roomId, participantId, pushEvent, updateRoomState]);

  // Auto-start session when room becomes ready and current user is the host
  useEffect(() => {
    if (!roomState || roomState.room.status === "active" || autoStartAttempted.current) return;
    if (!roomState.readiness.ready) return;
    if (roomState.room.hostParticipantId !== participantId) return;

    autoStartAttempted.current = true;
    startSession(roomState.room.id, { participantId })
      .then((response) => {
        updateRoomState(response.roomState);
        pushEvent("Conversation started.");
      })
      .catch(() => {
        autoStartAttempted.current = false;
      });
  }, [roomState, participantId, updateRoomState, pushEvent]);

  // Keep backend headphone readiness satisfied without exposing a manual button in UI.
  useEffect(() => {
    if (!roomState || roomState.room.mode !== "conversation" || roomState.room.status === "active" || autoHeadphoneConfirmAttempted.current) {
      return;
    }

    const myParticipant = roomState.participants.find((participant) => participant.id === participantId);
    if (!myParticipant) {
      return;
    }

    if (myParticipant.headphoneConfirmed) {
      autoHeadphoneConfirmAttempted.current = true;
      return;
    }

    autoHeadphoneConfirmAttempted.current = true;
    confirmHeadphones(participantId, { roomId: roomState.room.id, confirmed: true })
      .then((response) => {
        updateRoomState(response.roomState);
      })
      .catch(() => {
        // Allow retry if the silent confirm request fails.
        autoHeadphoneConfirmAttempted.current = false;
      });
  }, [participantId, roomState, updateRoomState]);

  const handleLeave = async () => {
    if (connected) {
      leaveCurrentRoom();
    } else {
      await leaveRoom({ roomId, participantId }).catch(() => undefined);
    }

    clearRoomSession(roomId);
    router.push("/");
  };

  if (!hasSession) {
    return (
      <main className="page stack">
        <div className="panel">
          <h1>Room session needed</h1>
          <p className="lead">Create or join a room to continue.</p>
          <Link className="button" href="/">
            Go home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page stack">
      <div className="topbar">
        <Link className="brand" href="/">
          Deka
        </Link>
        <button className="button warning" type="button" onClick={handleLeave}>
          Leave room
        </button>
      </div>

      {initialError || error ? <div className="error">{initialError ?? error}</div> : null}

      <section className="status-layout">
        {roomState ? (
          <div className="stack">
            {roomState.room.status === "active" ? (
              roomState.room.mode === "presentation" ? (
                <PresentationRoomView
                  roomState={roomState}
                  participantId={participantId}
                  translations={presentationTranslations}
                  lastDeniedSpeakRequestParticipantId={lastDeniedSpeakRequestParticipantId}
                  onRequestToSpeak={requestToSpeak}
                  onApproveSpeakRequest={approveSpeakRequest}
                  onDenySpeakRequest={denySpeakRequest}
                  onReleaseFloor={releaseFloor}
                  onSpeakerTurnSubmitted={submitSpeakerTurn}
                />
              ) : (
                <SessionActivePlaceholder roomState={roomState} participantId={participantId} />
              )
            ) : null}
            <RoomStatusPanel roomState={roomState} connected={connected} />
          </div>
        ) : (
          <div className="panel">
            <h1>Loading room</h1>
            <p className="lead">Preparing your conversation space.</p>
          </div>
        )}

        <aside className="panel stack">
          {roomState ? (
            <>
              {roomState.room.status !== "active" ? (
                <>
                  <RoomReadinessPanel roomState={roomState} participantId={participantId} onRoomState={updateRoomState} onEvent={pushEvent} />
                  <ReadinessChecklist roomState={roomState} />
                </>
              ) : null}
              {roomState.room.status !== "active" && roomState.room.mode === "conversation" && autoUpload !== "done" ? (
                autoUpload === "uploading" ? (
                  <div className="voice-uploader stack">
                    <h2>Voice sample</h2>
                    <p className="muted">Applying saved voice sample from your profile...</p>
                  </div>
                ) : (
                  <>
                    {autoUploadError ? <div className="error">{autoUploadError}</div> : null}
                    <VoiceSampleUploader
                      roomId={roomId}
                      participantId={participantId}
                      onUploaded={(response) => {
                        updateRoomState(response.roomState);
                        pushEvent("Voice sample uploaded.");
                      }}
                    />
                  </>
                )
              ) : null}
              {roomState.room.mode === "conversation" && roomState.room.status !== "active" ? (
                <div className="stack">
                  <h2>Voice clones</h2>
                  {roomState.participants.map((participant) => (
                    <VoiceCloneStatus participant={participant} key={`${participant.id}-${participant.voiceProfileId ?? "missing"}`} />
                  ))}
                </div>
              ) : null}
            </>
          ) : null}

          <div>
            <h2>Room events</h2>
            <ul className="event-list">
              {events.length > 0 ? events.map((event) => <li key={event}>{event}</li>) : <li className="muted">No events yet.</li>}
            </ul>
          </div>
        </aside>
      </section>
    </main>
  );
}
