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

`0.6.1-step07.1`

## Build status

- [x] **Step 01** — Schema, validators, persistence, shell UI
- [x] **Step 02** — Read-only canvas with pan/zoom, compass, scale bar
- [x] **Step 03** — Program DB probe + grid + Stage A zoning + Stage B room placement
- [x] **Step 04** — Stage B refinements: `count_rule`, `parti.*_cells`, `max_aspect_ratio`, `placement_zone`, STALE chip, RE-SEED FROM DB, unplaced pulse
- [x] **Step 05** — Drag-and-reflow (cascade depth 1) + lock gesture (6-reason chip) + locked-room pre-reservation in Stage B
- [x] **Step 06** — Reproportion gesture with alignment-group splitter: scrub a wall and every collinear wall in the group translates as a rigid line, with adjacent rooms shrinking/growing. Live area tooltip + ghost preview.
- [x] **Step 07** — Multi-floor generation + cross-floor drag: floor strip with thumbnails, add/remove floor buttons, room distribution by `stacking_preference` / `floor_priority` / `stack_group`, drag-onto-tile cross-floor move with cascade depth 1.
- [x] **Step 07.1** — Locked-room confirmation on `− REMOVE TOP`: if the top floor contains any locked rooms, the button is replaced by an inline CANCEL / PROCEED chip listing the affected rooms. No modal, no feature additions — trust fix only. *(current)*
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

### Step 05 notes

Step 05 turns the canvas from read-only into a first-pass editor. Two
gestures, single floor only:

- **Drag-and-reflow.** Click-hold a room, drag within its home department,
  release. `localReflow` re-packs the dropped room's cells and absorbs any
  displaced room into the vacated cells. Cascade depth is capped at 1 —
  dropping onto two rooms at once is rejected with a transient red chip.
- **Lock.** Right-click (or long-press / double-tap) a room to open the
  inline chip with six reasons: `client_request`, `code_required`,
  `site_constraint`, `daylight`, `adjacency`, `other`. One tap commits.
  Locked rooms render a 🔒 glyph in their label, refuse drags (pointer
  falls through to pan), and keep their cells across regenerates.

Rejection reasons (shown briefly as a bottom-left red chip):
`out_of_radius` (drop > 4 cells from origin), `locked_collision`,
`cascade_overflow`, `displaced_cannot_fit`, `outside_department`.

### Step 06 notes

Step 06 adds the third editor gesture: **reproportion with alignment-group
splitter**. Hover over any wall between two rooms in the same department and
the cursor becomes a resize indicator. The entire alignment group of
collinear walls highlights in accent blue. Click-drag and every wall in the
group translates together as a rigid line; every adjacent room shrinks or
grows accordingly. A small floating chip near the cursor shows the
cursor-side room's live `actual_area_sf` as the scrub progresses, plus a
"+N rooms moving" line when more than one room is affected.

Alignment-group membership is computed from geometry at scrub start — it is
never stored. Two walls are in the same group iff they share an axis, are
within half a cell on the perpendicular axis, and live in the same
department. A wall that drifts off-alignment in one scrub will re-join its
original group automatically when it's scrubbed back into line.

Gates / clamps:

- Every affected room must stay ≥ `min_width_cells × min_depth_cells`.
- Every affected room must remain rectangular — scrubs that would create
  L-shapes clamp at the last rectangular state.
- All new cells must remain in the affected room's home department.
- No affected room may overlap a locked room. If any wall in the group is
  adjacent to a locked room, the whole group is non-scrubbable: the cursor
  doesn't change on hover and the highlight never appears.
- Cross-department walls and facade walls are excluded from the wall index
  entirely — they don't participate in Step 06.

Escape mid-scrub drops the ghost without committing; a zero-offset release
is a silent no-op.

### Step 07 notes

Step 07 makes the engine multi-floor. Three coupled additions:

- **Schema.** `context.program.floor_count` (default 1) is the canonical
  floor count, kept in sync with `program_inputs.floor_count` so
  `count_rule: one_per_floor` keeps working. `current_plan.active_floor_index`
  (default 0) tracks which floor the canvas is showing.
- **Engine.** `distributeInstancesToFloors(instances, floorCount, footprintArea, lockedByFloor)`
  reads each template's `stacking_preference`, `floor_priority`, and
  `stack_group` and distributes the fresh-pool instances across floors.
  `generatePlan` then runs Stage A + Stage B per floor, sharing the same
  grid and sun vector across floors. Locked rooms preserve both their cells
  AND their floor assignment across regenerates.
- **UI.** A vertical `<FloorStrip>` overlay sits on the left side of the
  canvas (top-to-bottom = top floor → ground floor). Each tile is an inline
  SVG mini-render of one floor with a room count badge, an unplaced badge,
  and a 2-px accent border when active. Two buttons below add or remove
  the top floor; both leave a regenerate-prompt chip behind because they
  intentionally do NOT auto-regenerate (would erase locked-room positions).

Cross-floor drag works by extending the Step 05 room drag: while dragging,
`document.elementFromPoint` checks for a `data-floor-index` ancestor each
pointer move. When the cursor is over a tile other than the active floor,
the in-canvas ghost freezes and the tile glows accent blue (or red if the
target lacks a matching department region). On release, `crossFloorMove`
attempts to pack the room into the target floor's matching department,
with cascade depth 1 (at most one room may be displaced and absorbed into
its own department's free slack).

After a successful cross-floor drop, `active_floor_index` auto-switches
to the target so the user immediately sees the result.

Stacking preference normalization (the DB ships free-form values like
"Ground", "Ground/Roof", "Roof/Penthouse", "Upper", "Basement", "All"):

- contains "ground"/"basement" → **Ground** (floor 1)
- contains "roof"/"top"/"penthouse"/"upper" → **Top** (top floor)
- "any" / "all" / "same" / empty → **Any** (greedy by free capacity)
- mixed (e.g. "Ground/Roof", "Upper/Ground") → whichever class is named
  first in the string

`stack_group` co-location takes precedence over class preference: once
one member of `WET_STACK_A` lands on a floor, subsequent members prefer
the same floor.

### Step 07.1 notes

Scoped regression fix for Step 07. Clicking `− REMOVE TOP` on a floor that
contains locked rooms silently dropped those rooms from the plan (and the
next regenerate's locked-carry-over logic could migrate them down, push
them to `unplaced_rooms`, or simply lose them). That violates the lock
contract — a lock is supposed to represent a durable user intention.

The fix is consent-only:

- If the top floor has ≥ 1 locked room, `− REMOVE TOP` is replaced inline
  by a red-bordered confirmation chip: “REMOVE FLOOR *N* WITH *K* LOCKED
  ROOMS?” with a bullet list of up to 3 locked-room names (plus “+N more”
  when there are more) and two buttons — `CANCEL` (neutral) and `PROCEED`
  (white-on-red).
- CANCEL dismisses the chip and leaves the plan untouched.
- PROCEED re-enters the remove handler with a `confirmed=true` flag and
  runs the existing removal logic unchanged. Post-removal migration
  behavior is the same as Step 07.
- Each floor removal requires its own confirmation — no session-scoped
  “already confirmed once” shortcut.
- The pending state is ephemeral: it lives in React state only, not in
  the persisted project.

## Section map inside `index.html`

Grep for `SECTION 0` to find each region. Steps 02–09 each fill in one or more sections without touching the others. This is the v7→v8 rule made physical.
