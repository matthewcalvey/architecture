import { useEffect, useRef, useState } from "react";
import { localProgramCatalogAdapter } from "../data/adapters/programAdapter";
import { getSelectedFloor, getSelectedRoom } from "../editor/selection/useEditorSelection";
import { PlanCanvas } from "../editor/canvas/PlanCanvas";
import { createDefaultProject } from "../models/defaults";
import { PartyProject } from "../models/types";
import { round } from "../utils/math";
import { RoomInspector } from "../components/RoomInspector";
import { SessionPanel } from "../components/SessionPanel";
import { usePartyStore } from "./store";

function buildCurrentSignature(project: PartyProject): string {
  return JSON.stringify({
    footprint: project.site.footprint,
    trueNorthDeg: project.site.trueNorthDeg,
    latitude: round(project.site.latitude, 4),
    longitude: round(project.site.longitude, 4),
    anchors: project.site.anchors,
    context: project.site.context,
    buildingTypeId: project.programSelection.buildingTypeId,
    weights: project.weights,
    seed: project.seed
  });
}

export function App() {
  const {
    hydrated,
    catalog,
    project,
    selectedFloorId,
    selectedRoomId,
    hydrate,
    selectFloor,
    selectRoom,
    generateBestGuess,
    updateProgramSelection,
    updateWeight,
    updateSiteMeta,
    updateSeed,
    commitRoomGeometry,
    moveRoomToFloor,
    commitNotes,
    resetToEngine,
    importProject,
    exportProjectJson,
    exportCurrentFloorSvg
  } = usePartyStore();
  const [notesDraft, setNotesDraft] = useState(project.notes);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!hydrated) {
      hydrate();
    }
  }, [hydrate, hydrated]);

  useEffect(() => {
    setNotesDraft(project.notes);
  }, [project.notes]);

  const currentPlan = project.committedPlan;
  const selectedFloor = getSelectedFloor(currentPlan, selectedFloorId);
  const selectedRoom = getSelectedRoom(currentPlan, selectedRoomId);
  const program = localProgramCatalogAdapter.getDefinition(
    project.programSelection.buildingTypeId
  );
  const isStale = project.engineProposal
    ? buildCurrentSignature(project) !== project.engineProposal.inputSignature
    : false;

  if (!hydrated) {
    const loadingProject = createDefaultProject();

    return (
      <div className="app-shell">
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="eyebrow">CALVEY PARTY 2</div>
              <h1 className="title">{loadingProject.name}</h1>
            </div>
          </div>
          <div className="panel-body">
            <div className="metric-card">
              <strong>Loading project state…</strong>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="panel">
        <div className="panel-header">
          <div>
            <div className="eyebrow">CALVEY PARTY 2</div>
            <h1 className="title">{project.name}</h1>
            <div className="subtle">
              Deterministic single-plan engine with architect-in-the-loop editing.
            </div>
          </div>
        </div>

        <div className="panel-body">
          <div className="metric-row">
            <span className="metric-chip">
              Overall {Math.round((currentPlan?.score.overall ?? 0) * 100)}%
            </span>
            <span className="metric-chip">
              Signals {project.session.signals.length}
            </span>
            <span className="metric-chip">
              Events {project.session.events.length}
            </span>
          </div>

          <div className="warning-row">
            {currentPlan?.warnings.map((warning) => (
              <span
                className="warning-chip"
                data-severity={warning.severity}
                key={warning.id}
              >
                {warning.message}
              </span>
            ))}
          </div>

          <div className="stack">
            <div className="eyebrow">Program</div>
            <div className="field">
              <label htmlFor="program-select">Building Type</label>
              <select
                id="program-select"
                onChange={(event) => updateProgramSelection(event.target.value)}
                value={project.programSelection.buildingTypeId}
              >
                {catalog.definitions.map((definition) => (
                  <option key={definition.id} value={definition.id}>
                    {definition.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="subtle">
              Changing the program updates the adapter target. Regenerate when you want a
              new best guess.
            </div>
          </div>

          <div className="stack">
            <div className="eyebrow">Site Meta</div>
            <div className="grid-2">
              <div className="field">
                <label htmlFor="true-north">True North</label>
                <input
                  id="true-north"
                  onChange={(event) => updateSiteMeta("trueNorthDeg", Number(event.target.value))}
                  type="number"
                  value={project.site.trueNorthDeg}
                />
              </div>
              <div className="field">
                <label htmlFor="seed">Seed</label>
                <input
                  id="seed"
                  onChange={(event) => updateSeed(event.target.value)}
                  type="text"
                  value={project.seed}
                />
              </div>
              <div className="field">
                <label htmlFor="latitude">Latitude</label>
                <input
                  id="latitude"
                  onChange={(event) => updateSiteMeta("latitude", Number(event.target.value))}
                  step="0.0001"
                  type="number"
                  value={project.site.latitude}
                />
              </div>
              <div className="field">
                <label htmlFor="longitude">Longitude</label>
                <input
                  id="longitude"
                  onChange={(event) => updateSiteMeta("longitude", Number(event.target.value))}
                  step="0.0001"
                  type="number"
                  value={project.site.longitude}
                />
              </div>
            </div>
          </div>

          <div className="stack">
            <div className="eyebrow">Scoring Weights</div>
            {(
              [
                ["adjacency", "Adjacency"],
                ["daylight", "Daylight"],
                ["circulation", "Circulation"],
                ["structure", "Structure"],
                ["compactness", "Compactness"]
              ] as const
            ).map(([key, label]) => (
              <div className="slider-row" key={key}>
                <label htmlFor={key}>{label}</label>
                <div>{project.weights[key]}</div>
                <input
                  id={key}
                  max={50}
                  min={5}
                  onChange={(event) => updateWeight(key, Number(event.target.value))}
                  type="range"
                  value={project.weights[key]}
                />
              </div>
            ))}
          </div>

          <div className="button-row">
            <button className="btn btn-primary" onClick={generateBestGuess} type="button">
              Generate Best Guess
            </button>
            <button className="btn btn-secondary" onClick={resetToEngine} type="button">
              Reset To Engine
            </button>
            <button className="btn btn-secondary" onClick={exportProjectJson} type="button">
              Export JSON
            </button>
            <button className="btn btn-secondary" onClick={exportCurrentFloorSvg} type="button">
              Export SVG
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => importRef.current?.click()}
              type="button"
            >
              Import JSON
            </button>
            <input
              className="sr-only"
              onChange={async (event) => {
                const file = event.target.files?.[0];

                if (!file) {
                  return;
                }

                const contents = await file.text();
                importProject(contents);
                event.target.value = "";
              }}
              ref={importRef}
              type="file"
            />
          </div>

          <div className="stack">
            <div className="eyebrow">Notes</div>
            <div className="field">
              <label htmlFor="project-notes">Commit only meaningful rationale.</label>
              <textarea
                id="project-notes"
                onChange={(event) => setNotesDraft(event.target.value)}
                value={notesDraft}
              />
            </div>
            <button
              className="btn btn-secondary"
              onClick={() => commitNotes(notesDraft)}
              type="button"
            >
              Commit Notes To Session
            </button>
          </div>
        </div>
      </div>

      <PlanCanvas
        isStale={isStale}
        onCommitRoomGeometry={commitRoomGeometry}
        onMoveRoomToFloor={moveRoomToFloor}
        onSelectFloor={selectFloor}
        onSelectRoom={selectRoom}
        plan={currentPlan}
        selectedFloorId={selectedFloorId}
        selectedRoomId={selectedRoomId}
        site={project.site}
      />

      <div className="panel">
        <div className="panel-header">
          <div>
            <div className="eyebrow">Inspector</div>
            <h2 className="title">Room + Session</h2>
          </div>
        </div>
        <div className="panel-body">
          <div className="stack">
            <div className="eyebrow">Room Schedule</div>
            <div className="scroll-list">
              {currentPlan?.roomSchedule.slice(0, 8).map((item) => (
                <div
                  className={[
                    "room-card",
                    selectedRoom?.id === item.roomId ? "is-active" : ""
                  ]
                    .filter(Boolean)
                    .join(" ")}
                    key={item.roomId}
                    onClick={() => {
                      selectRoom(item.roomId);
                      const nextFloor = currentPlan.floors.find(
                        (floor) => floor.label === item.floorLabel
                      );
                      if (nextFloor) {
                        selectFloor(nextFloor.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        selectRoom(item.roomId);
                      }
                    }}
                >
                  <strong>{item.roomName}</strong>
                  <div className="subtle">
                    {item.floorLabel} · {item.actualArea.toFixed(0)} sf actual
                  </div>
                </div>
              ))}
            </div>
          </div>

          <RoomInspector program={program} room={selectedRoom} />
          <SessionPanel
            events={project.session.events}
            signals={project.session.signals}
          />
          <div className="room-card">
            <div className="subtle">Selected Floor</div>
            <strong>{selectedFloor?.label ?? "None"}</strong>
            <div className="subtle">
              {selectedFloor ? `${selectedFloor.rooms.length} active rooms` : "Generate a plan to begin."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
