# CALVEY PARTY 2

CALVEY PARTY 2 is a stand-alone rebuild of the earlier CALVEY floor-planning prototypes. It ships as a modular React + TypeScript + Vite application with a deterministic single-plan engine, an SVG editor, local persistence, export tools, and typed session logging intended for later ML calibration.

## Product Principles

- Deterministic generation: the same footprint, program, weights, anchors, and seed produce the same plan.
- Single best guess: the engine commits to one scored plan rather than generating a gallery of random options.
- Architect in the loop: rooms stay directly editable on the canvas, with non-blocking warnings instead of hard stops.
- Structured learning data: the app logs meaningful differences between the engine proposal and the committed plan.
- Modular architecture: engine, editor, persistence, sessions, exports, and data adapters remain separated for future backend migration.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:3000`.

## Scripts

- `npm run dev` starts the Vite dev server.
- `npm run build` runs TypeScript checks and produces a production build.
- `npm test` runs deterministic engine and session logging tests with Vitest.

## Current Capabilities

- Deterministic zoning -> placement -> adjacency repair -> confidence scoring pipeline
- Multi-floor best-guess plan generation from local fixture program data
- SVG editor with pan, zoom, room dragging, edge resizing, and floor-to-floor drag transfer
- Persistent project state in `localStorage`
- JSON project export and per-floor SVG export
- Room schedule, score breakdowns, warnings, and room-by-room confidence explanations
- Structured session events and derived geometry signals

## Data Strategy

The application currently resolves building programs through the local adapter in `src/data/adapters/programAdapter.ts`, backed by fixtures in `src/data/fixtures/programCatalog.ts`.

This is the explicit boundary for a future canonical CALVEY program source. When that source is available, the adapter can be swapped without rewriting the editor or engine.

## Project Layout

```text
src/
  app/             App shell and Zustand store
  components/      Inspector and session UI
  data/            Adapter seam, fixtures, loaders, validators
  editor/          SVG canvas, viewport gestures, overlays, selection helpers
  engine/          Deterministic zoning, placement, adjacency, scoring, confidence
  exporters/       JSON and SVG export helpers
  models/          Typed domain models and default project bootstrap
  persistence/     localStorage save/load
  sessions/        Typed event and derived-signal logging
  styles/          Global UI styling
tests/             Engine and session regression tests
docs/              Architecture notes
```

## Notes

- The current implementation keeps all project data inside the browser for stand-alone local use.
- The adapter, score pipeline, and project model are ready for later backendization of solving, sync, and ML scoring.
- Browser automation verification was attempted during build-out, but the `agent-browser` CLI was unavailable in this environment. Build and tests still pass locally.
