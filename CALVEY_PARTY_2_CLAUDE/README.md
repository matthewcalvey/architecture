# CALVEY_PARTY_2 — Sandbox

Standalone, clean-slate test bed for the deterministic plan engine. Built from scratch using everything we learned from CALVEY_PARTI v7–v13. **Not integrated** with any other CALVEY_* folder — this is a side-by-side evaluation candidate, not a replacement.

## Run

Open `index.html` in any modern browser. Most things work on `file://`.

If the program database fetch is blocked by your browser's CORS policy on `file://`, run a local server:

    cd CALVEY_PARTY_2_CLAUDE
    python3 -m http.server 8000

Then open `http://localhost:8000`.

## Program database

This sandbox expects the CALVEY_PROGRAM database under `./data/`. The real master index is `building_program_database_master_updated.json` (v0.2, with a top-level `databases` array of building types). `master_index.json` was a placeholder name from the original spec — the code now probes the real filenames.

On mount, the app tries these paths in order and uses the first one that returns valid JSON:

1. `./data/master_index.json`
2. `./data/building_program_database_master_updated.json`
3. `./data/building_program_database_master.json`
4. `./data/CALVEY_PROGRAM/data/building_program_database_master_updated.json`
5. `./data/CALVEY_PROGRAM/data/building_program_database_master.json`

So either of these layouts works:

    # flat layout (preferred)
    CALVEY_PARTY_2_CLAUDE/data/building_program_database_master_updated.json

    # nested layout (what `cp -r ../CALVEY_PROGRAM ./data` produces when ./data already exists)
    CALVEY_PARTY_2_CLAUDE/data/CALVEY_PROGRAM/data/building_program_database_master_updated.json

If none are found, the status line will read "not present."

## Schema version

`2.1-party`

## Engine version

`0.3.0-step04`

## Build status

- [x] **Step 01** — Schema, validators, persistence, shell UI
- [x] **Step 02** — Read-only canvas with pan/zoom, compass, scale bar
- [x] **Step 03** — Program DB probe + grid + Stage A zoning + Stage B room placement
- [x] **Step 04** — Stage B refinements: `count_rule`, `parti.*_cells`, `max_aspect_ratio`, `placement_zone`, STALE chip, RE-SEED FROM DB, unplaced pulse *(current)*
- [ ] Step 05 — Drag-and-reflow + reproportion + lock gestures + session event scaffolding
- [ ] Step 06 — Stage C adjacency repair + Stage D confidence scoring
- [ ] Step 07 — Multi-floor generation + cross-floor drag
- [ ] Step 08 — Sliders + regenerate + session completion / end-chips
- [ ] Step 09 — Exporters (JSON / SVG / PDF)

### Step 04 notes

Step 04 refines the Stage B packer that Step 03 built. In particular:

- `context.program.program_inputs` is a new field seeded from
  `buildingType.subtypes[0]` (e.g. K-12 seeds `students` from
  `student_count_typical`). Only absent keys are filled on generate, so user
  edits persist. Click **RE-SEED FROM DB** to discard edits and reseed.
- Room instances are resolved from each template's `count_rule`
  (`one_per_building`, `one_per_floor`, `per_driver`, `per_occupant`, …) and
  `scaling.step_thresholds`. K-12 now produces multiple Science Lab / Art /
  Music instances instead of one of each.
- Stage B honors `parti.max_aspect_ratio` as a *hard ceiling* — no more 6×1
  corridor slivers. Unfittable rectangles are rejected and the room ends up
  in the unplaced panel instead.
- Click any row in the unplaced panel to pulse the corresponding department's
  empty slack cells for 2.4 s.
- Edit the footprint polygon, `program_inputs`, or `building_type` in the
  JSON viewer → an amber **STALE** chip appears until you regenerate.

## Section map inside `index.html`

Grep for `SECTION 0` to find each region. Steps 02–09 each fill in one or more sections without touching the others. This is the v7→v8 rule made physical.
