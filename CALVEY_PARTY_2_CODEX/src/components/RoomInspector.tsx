import { BuildingProgramDefinition, PlanRoom } from "../models/types";

interface RoomInspectorProps {
  room: PlanRoom | null;
  program: BuildingProgramDefinition | null;
}

export function RoomInspector({ room, program }: RoomInspectorProps) {
  if (!room) {
    return (
      <div className="stack">
        <div className="eyebrow">Room Inspector</div>
        <div className="room-card">
          <strong>No room selected</strong>
          <p className="subtle">
            Pick a room on the canvas to inspect score breakdowns, confidence, and
            geometry deltas.
          </p>
        </div>
      </div>
    );
  }

  const definition = program?.roomDefinitions.find(
    (roomDefinition) => roomDefinition.id === room.roomTypeId
  );

  return (
    <div className="stack">
      <div>
        <div className="eyebrow">Room Inspector</div>
        <h3 className="title" style={{ fontSize: "1.2rem" }}>
          {room.name}
        </h3>
        <div className="subtle">
          {room.department} · {room.floorId.replace("-", " ")}
        </div>
      </div>

      <div className="room-card is-active">
        <div className="grid-2">
          <div>
            <div className="subtle">Target Area</div>
            <strong>{room.targetArea.toFixed(0)} sf</strong>
          </div>
          <div>
            <div className="subtle">Actual Area</div>
            <strong>{room.actualArea.toFixed(0)} sf</strong>
          </div>
          <div>
            <div className="subtle">Geometry</div>
            <strong>
              {room.geometry.width.toFixed(1)}' x {room.geometry.height.toFixed(1)}'
            </strong>
          </div>
          <div>
            <div className="subtle">Confidence</div>
            <strong>
              {Math.round(room.confidence.value * 100)}% · {room.confidence.label}
            </strong>
          </div>
        </div>
      </div>

      <div className="metric-card">
        <div className="subtle">Total score</div>
        <strong>{Math.round(room.score.total * 100)}%</strong>
        <div className="bar">
          <span style={{ width: `${room.score.total * 100}%` }} />
        </div>
      </div>

      {[
        ["Adjacency", room.score.adjacency],
        ["Daylight", room.score.daylight],
        ["Circulation", room.score.circulation],
        ["Structure", room.score.structure],
        ["Compactness", room.score.compactness]
      ].map(([label, value]) => (
        <div className="metric-card" key={label}>
          <div className="subtle">{label}</div>
          <strong>{Math.round((value as number) * 100)}%</strong>
          <div className="bar">
            <span style={{ width: `${(value as number) * 100}%` }} />
          </div>
        </div>
      ))}

      <div className="room-card">
        <div className="subtle">Constraint intent</div>
        <strong>{definition?.preferredOrientation ?? room.preferredOrientation}</strong>
        <p className="subtle" style={{ marginBottom: 0 }}>
          Aspect band:{" "}
          {definition
            ? `${definition.aspectRatioRange[0]} - ${definition.aspectRatioRange[1]}`
            : "Unknown"}
        </p>
      </div>

      <div className="room-card">
        <div className="subtle">Confidence explanation</div>
        <div className="scroll-list">
          {room.confidence.reasons.map((reason) => (
            <div key={reason}>{reason}</div>
          ))}
        </div>
      </div>

      <div className="room-card">
        <div className="subtle">Adjacency notes</div>
        <div className="scroll-list">
          {room.score.notes.map((note) => (
            <div key={note}>{note}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
