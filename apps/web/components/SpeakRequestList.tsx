import type { Participant, SpeakRequest } from "@translator/shared";

interface SpeakRequestListProps {
  requests: SpeakRequest[];
  participants: Participant[];
  isHost: boolean;
  onApprove: (participantId: string) => void;
  onDeny: (participantId: string) => void;
}

export function SpeakRequestList({ requests, participants, isHost, onApprove, onDeny }: SpeakRequestListProps) {
  const participantsById = new Map(participants.map((participant) => [participant.id, participant]));

  return (
    <section className="panel stack">
      <div>
        <p className="eyebrow">Speak requests</p>
        <h2>{requests.length > 0 ? `${requests.length} pending` : "No pending requests"}</h2>
      </div>
      {requests.length === 0 ? (
        <p className="muted">Listeners can request the floor here.</p>
      ) : (
        <ul className="participant-list">
          {requests.map((request) => {
            const participant = participantsById.get(request.participantId);

            return (
              <li className="participant-item" key={`${request.participantId}-${request.requestedAt}`}>
                <strong>{participant?.name ?? "Unknown listener"}</strong>
                <span className="muted">
                  {participant?.nativeLanguage ?? "Unknown"} to {participant?.targetLanguage ?? "Unknown"}
                </span>
                {isHost ? (
                  <div className="button-row">
                    <button className="button" type="button" onClick={() => onApprove(request.participantId)}>
                      Approve
                    </button>
                    <button className="button warning" type="button" onClick={() => onDeny(request.participantId)}>
                      Deny
                    </button>
                  </div>
                ) : (
                  <span className="muted">Host is reviewing.</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
