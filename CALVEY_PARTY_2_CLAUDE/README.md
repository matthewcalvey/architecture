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

## Build status

- [x] **Step 01** — Schema, validators, persistence, shell UI
- [x] **Step 02** — Read-only canvas + footprint rendering
- [ ] **Step 03** — Program DB schema probe + grid substrate + Stage A department zoning *(in progress)*
- [ ] Step 04 — Stage B room placement
- [ ] Step 05 — Drag-and-reflow gesture
- [ ] Step 06 — Reproportion / cross-floor / lock gestures
- [ ] Step 07 — Stage C adjacency repair + Stage D confidence scoring
- [ ] Step 08 — Sliders + regenerate
- [ ] Step 09 — Sessions + end-of-session chips
- [ ] Step 10 — Exporters (JSON / SVG / PDF)

## Section map inside `index.html`

Grep for `SECTION 0` to find each region. Steps 02–09 each fill in one or more sections without touching the others. This is the v7→v8 rule made physical.
