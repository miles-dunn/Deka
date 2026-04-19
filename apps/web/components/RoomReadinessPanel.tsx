"use client";

import { useMemo, useState } from "react";
import type { ReadinessRequirement, RoomState } from "@translator/shared";
import { startSession } from "../lib/api";

const requirementLabels: Record<ReadinessRequirement, string> = {
  connected: "Both participants must be connected.",
  languages_selected: "Both participants need native and target languages.",
  voice_sample_uploaded: "Both participants need a voice sample.",
  headphones_confirmed: "Both participants need to confirm headphones.",
  two_participants: "The room needs exactly two participants.",
  conversation_mode: "The room must be in conversation mode.",
  active_speaker_assigned: "The room needs an active speaker.",
  active_speaker_ready: "The active speaker must complete readiness checks."
};

interface RoomReadinessPanelProps {
  roomState: RoomState;
  participantId: string;
  onEvent: (message: string) => void;
  onRoomState: (roomState: RoomState) => void;
}

export function RoomReadinessPanel({ roomState, participantId, onEvent, onRoomState }: RoomReadinessPanelProps) {
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const isHost = roomState.room.hostParticipantId === participantId;
  const missingRequirements = useMemo(
    () =>
      roomState.readiness.missingRequirements
        .filter((requirement) => requirement !== "headphones_confirmed")
        .map((requirement) => requirementLabels[requirement]),
    [roomState.readiness.missingRequirements]
  );

  const handleStartSession = async () => {
    setError(null);
    setIsStarting(true);

    try {
      const response = await startSession(roomState.room.id, { participantId });
      onRoomState(response.roomState);
      onEvent(roomState.room.mode === "presentation" ? "Presentation session started." : "Conversation session started.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Room is not ready to start");
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="stack">
      <div>
        <h2>Ready to begin</h2>
        <p className="muted">
          {roomState.readiness.ready
            ? "Everything is set."
            : missingRequirements.length > 0
              ? "Complete the remaining setup steps."
              : "Final device checks are finishing in the background."}
        </p>
      </div>

      {missingRequirements.length > 0 ? (
        <ul className="todo-list muted">
          {missingRequirements.map((requirement) => (
            <li key={requirement}>{requirement}</li>
          ))}
        </ul>
      ) : null}

      <button className="button" type="button" onClick={handleStartSession} disabled={!isHost || isStarting || roomState.room.status === "active"}>
        {isHost
          ? isStarting
            ? "Starting..."
            : roomState.room.mode === "presentation"
              ? "Start presentation"
              : "Start conversation"
          : roomState.room.mode === "presentation"
            ? "Host starts presentation"
            : "Host starts conversation"}
      </button>

      {error ? <div className="error">{error}</div> : null}
    </div>
  );
}
