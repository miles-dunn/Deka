import { memo } from "react";
import type { RealtimeDebugEvent } from "../types/realtime";

interface RealtimeDebugPanelProps {
  events: RealtimeDebugEvent[];
  error: string | null;
}

export const RealtimeDebugPanel = memo(function RealtimeDebugPanel({ events, error }: RealtimeDebugPanelProps) {
  return (
    <details className="debug-panel">
      <summary>Technical details</summary>

      {error ? <div className="error">{error}</div> : null}

      <ul className="debug-list">
        {events.length > 0 ? (
          events.map((event) => (
            <li className={`debug-item ${event.direction}`} key={event.id}>
              <strong>
                {event.timestamp} - {event.type}
              </strong>
              {event.detail ? <span>{event.detail}</span> : null}
            </li>
          ))
        ) : (
          <li className="muted">No Realtime events yet.</li>
        )}
      </ul>
    </details>
  );
});
