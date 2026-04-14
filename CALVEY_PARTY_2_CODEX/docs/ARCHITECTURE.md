# Architecture Notes

## Solve Pipeline

The deterministic engine is split into four explicit phases:

1. `zoneFootprint`
   - Reads the footprint polygon and building program.
   - Decides floor count deterministically from target area pressure.
   - Builds corridors and lane zones for each floor.

2. `placeRooms`
   - Assigns rooms to floors and corridor lanes without random retry loops.
   - Packs rooms in a stable order derived from department priority, area, and seed.

3. `repairAdjacency`
   - Reorders rooms within each floor using adjacency-connected components.
   - Improves local clustering without branching into multi-option search.

4. `scorePlan` + `estimateConfidence`
   - Scores rooms for adjacency, daylight, circulation, structure, and compactness.
   - Produces room-level confidence explanations and plan-level warnings.

## State Model

The Zustand store is the app source of truth. It owns:

- project metadata
- current engine proposal
- committed editable plan
- selected floor and room
- persistence to `localStorage`
- export actions
- structured session logging

The editor keeps only transient gesture state locally. Commit-level geometry changes flow back through store actions so the persisted project and the logged learning signals stay aligned.

## Learning Signal Strategy

The app intentionally does **not** log noisy cursor trails or hover durations.

Instead it records:

- typed session events such as `generate_plan`, `move_room`, `resize_room`, `move_room_floor`, and `commit_note`
- derived geometric signals such as:
  - moved rooms
  - resized rooms
  - floor reassignments

Those signals are computed as the difference between:

- `engineProposal`
- `committedPlan`

## Adapter Boundary

`src/data/adapters/programAdapter.ts` is the seam for the future canonical CALVEY program source.

Today it resolves local fixture data. Tomorrow it can resolve CALVEY program data from a shared store or backend, while the rest of the application continues to consume the same typed interface.

## Export Boundary

The exporter layer is intentionally thin:

- JSON export preserves the full typed project for reload or downstream analysis.
- SVG export provides a shareable floor snapshot without entangling the engine with rendering concerns.
