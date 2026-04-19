import type { RoomState } from "@translator/shared";
import { VoiceProfileStatus } from "./VoiceProfileStatus";

interface RoomStatusPanelProps {
  roomState: RoomState;
  connected: boolean;
}

export function RoomStatusPanel({ roomState, connected }: RoomStatusPanelProps) {
  const host = roomState.participants.find((participant) => participant.id === roomState.room.hostParticipantId);
  const activeSpeaker = roomState.participants.find((participant) => participant.id === roomState.room.activeSpeakerParticipantId);
  const participantsById = new Map(roomState.participants.map((participant) => [participant.id, participant]));

  return (
    <div className="panel stack">
      <div>
        <p className="eyebrow">Invite code</p>
        <div className="room-code">{roomState.room.code}</div>
      </div>

      <div>
        <h2>Room status</h2>
        <p className="muted">
          {roomState.room.mode} - {roomState.room.status.replace("_", " ")} - {roomState.participants.length}/{roomState.room.maxParticipants} joined - socket{" "}
          {connected ? "online" : "offline"}
        </p>
        <p className="muted">
          Host: <strong>{host?.name ?? "Unassigned"}</strong>
          {roomState.room.mode === "presentation" ? (
            <>
              {" "}
              - Active speaker: <strong>{activeSpeaker?.name ?? "Unassigned"}</strong>
            </>
          ) : null}
        </p>
        {roomState.room.mode === "presentation" ? (
          <p className="muted">Pending speak requests: {roomState.room.pendingSpeakRequests.length}</p>
        ) : null}
      </div>

      <div>
        <h2>Participants</h2>
        <ul className="participant-list">
          {roomState.participants.map((participant) => (
            <li className="participant-item" key={participant.id}>
              <strong>
                <span className={`status-dot ${participant.connectionStatus}`} />
                {participant.name} - {participant.role}
              </strong>
              <span className="muted">
                {participant.nativeLanguage} to {participant.targetLanguage}
              </span>
              <VoiceProfileStatus participant={participant} />
            </li>
          ))}
        </ul>
      </div>

      {roomState.room.mode === "presentation" && roomState.room.pendingSpeakRequests.length > 0 ? (
        <div>
          <h2>Pending requests</h2>
          <ul className="participant-list">
            {roomState.room.pendingSpeakRequests.map((request) => {
              const participant = participantsById.get(request.participantId);

              return (
                <li className="participant-item" key={`${request.participantId}-${request.requestedAt}`}>
                  <strong>{participant?.name ?? "Unknown listener"}</strong>
                  <span className="muted">
                    {participant?.nativeLanguage ?? "Unknown"} to {participant?.targetLanguage ?? "Unknown"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
