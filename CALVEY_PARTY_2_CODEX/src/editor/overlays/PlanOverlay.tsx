import { FloorPlan, PlanModel } from "../../models/types";

interface PlanOverlayProps {
  plan: PlanModel | null;
  floor: FloorPlan | null;
  isStale: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}

export function PlanOverlay({
  plan,
  floor,
  isStale,
  onZoomIn,
  onZoomOut,
  onFit
}: PlanOverlayProps) {
  const roomCount = floor?.rooms.length ?? 0;

  return (
    <div className="canvas-toolbar">
      <div className="pill-row">
        <span className="pill is-active">Single Best Guess</span>
        <span className="pill">{floor?.label ?? "No Floor Selected"}</span>
        <span className="pill">{roomCount} rooms</span>
        {isStale ? <span className="warning-chip">Proposal stale</span> : null}
      </div>
      <div className="button-row">
        <span className="metric-chip">Score {Math.round((plan?.score.overall ?? 0) * 100)}%</span>
        <button className="btn btn-secondary" onClick={onZoomOut} type="button">
          -
        </button>
        <button className="btn btn-secondary" onClick={onFit} type="button">
          Fit
        </button>
        <button className="btn btn-secondary" onClick={onZoomIn} type="button">
          +
        </button>
      </div>
    </div>
  );
}
