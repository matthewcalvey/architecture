# CALVEY_PARTY_2 — Sandbox

Standalone, clean-slate test bed for the deterministic plan engine. Built from scratch using everything we learned from CALVEY_PARTI v7–v13. **Not integrated** with any other CALVEY_* folder — this is a side-by-side evaluation candidate, not a replacement.

## Run

Open `index.html` in any modern browser. Most things work on `file://`.

If the program database fetch is blocked by your browser's CORS policy on `file://`, run a local server:

    cd CALVEY_PARTY_2_CLAUDE
    python3 -m http.server 8000

Then open `http://localhost:8000`.

## Program database

This sandbox expects `./data/` to contain a copy of the CALVEY_PROGRAM database (`master_index.json` plus one JSON per building type). Copy it in manually:

    cp -r ../CALVEY_PROGRAM/data ./data

Until you do, the program database status line will read "not present."

## Schema version

`2.1-party`

## Build status

- [x] **Step 01** — Schema, validators, persistence, shell UI
- [ ] Step 02 — Read-only canvas + footprint rendering
- [ ] Step 03 — Stage A zoning + Stage B placement
- [ ] Step 04 — Drag-and-reflow gesture
- [ ] Step 05 — Reproportion / cross-floor / lock gestures
- [ ] Step 06 — Stage C repair + Stage D confidence
- [ ] Step 07 — Sliders + regenerate
- [ ] Step 08 — Sessions + end-of-session chips
- [ ] Step 09 — Exporters (JSON / SVG / PDF)

## Section map inside `index.html`

Grep for `SECTION 0` to find each region. Steps 02–09 each fill in one or more sections without touching the others. This is the v7→v8 rule made physical.
