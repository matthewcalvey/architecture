import { DerivedSignal, SessionEvent } from "../models/types";

interface SessionPanelProps {
  events: SessionEvent[];
  signals: DerivedSignal[];
}

export function SessionPanel({ events, signals }: SessionPanelProps) {
  return (
    <div className="stack">
      <div>
        <div className="eyebrow">Structured Session</div>
        <h3 className="title" style={{ fontSize: "1.2rem" }}>
          Logged Decisions
        </h3>
      </div>

      <div className="scroll-list">
        {signals.slice(0, 6).map((signal) => (
          <div className="signal-card" key={signal.id}>
            <div className="subtle">{signal.kind}</div>
            <strong>{signal.roomName}</strong>
            <div>{signal.detail}</div>
          </div>
        ))}
        {!signals.length ? (
          <div className="signal-card">
            <strong>No delta signals yet</strong>
            <div className="subtle">
              Generate a plan, then edit rooms to capture the difference between the
              engine proposal and the committed design.
            </div>
          </div>
        ) : null}
      </div>

      <div className="scroll-list">
        {events
          .slice()
          .reverse()
          .slice(0, 8)
          .map((event) => (
            <div className="event-card" key={event.id}>
              <div className="subtle">{event.type}</div>
              <strong>{new Date(event.timestamp).toLocaleString()}</strong>
              <div className="mono">{JSON.stringify(event.payload)}</div>
            </div>
          ))}
      </div>
    </div>
  );
}
