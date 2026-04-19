import type { ParticipantReadiness, ReadinessRequirement, RoomState } from "@translator/shared";

const requirementLabels: Record<ReadinessRequirement, string> = {
  connected: "joined",
  languages_selected: "languages selected",
  voice_sample_uploaded: "voice sample uploaded",
  headphones_confirmed: "headphones confirmed",
  two_participants: "two participants",
  conversation_mode: "conversation mode",
  active_speaker_assigned: "active speaker assigned",
  active_speaker_ready: "active speaker ready"
};

const statusLabel = (passed: boolean) => (passed ? "Done" : "Needed");

interface ReadinessChecklistProps {
  roomState: RoomState;
}

export function ReadinessChecklist({ roomState }: ReadinessChecklistProps) {
  const readinessByParticipant = new Map(roomState.readiness.participants.map((readiness) => [readiness.participantId, readiness]));

  const renderRow = (label: string, passed: boolean) => (
    <li className="check-row" key={label}>
      <span>{label}</span>
      <strong className={passed ? "check-pass" : "check-missing"}>{statusLabel(passed)}</strong>
    </li>
  );

  const renderParticipant = (readiness: ParticipantReadiness | undefined) => {
    if (!readiness) {
      return null;
    }

    return [
      renderRow(requirementLabels.connected, readiness.connected),
      renderRow(requirementLabels.languages_selected, readiness.languagesSelected),
      renderRow(requirementLabels.voice_sample_uploaded, readiness.voiceSampleUploaded)
    ];
  };

  return (
    <div className="stack">
      <h2>Readiness checklist</h2>
      {roomState.participants.map((participant) => (
        <div className="check-group" key={participant.id}>
          <strong>
            {participant.name} - {participant.role}
          </strong>
          <ul className="check-list">{renderParticipant(readinessByParticipant.get(participant.id))}</ul>
        </div>
      ))}
    </div>
  );
}
