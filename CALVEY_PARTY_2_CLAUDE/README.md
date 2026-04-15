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

`1.0.0-v1`

## Build status

- [x] **Step 01** — Schema, validators, persistence, shell UI
- [x] **Step 02** — Read-only canvas with pan/zoom, compass, scale bar
- [x] **Step 03** — Program DB probe + grid + Stage A zoning + Stage B room placement
- [x] **Step 04** — Stage B refinements: `count_rule`, `parti.*_cells`, `max_aspect_ratio`, `placement_zone`, STALE chip, RE-SEED FROM DB, unplaced pulse
- [x] **Step 05** — Drag-and-reflow (cascade depth 1) + lock gesture (6-reason chip) + locked-room pre-reservation in Stage B
- [x] **Step 06** — Reproportion gesture with alignment-group splitter: scrub a wall and every collinear wall in the group translates as a rigid line, with adjacent rooms shrinking/growing. Live area tooltip + ghost preview.
- [x] **Step 07** — Multi-floor generation + cross-floor drag: floor strip with thumbnails, add/remove floor buttons, room distribution by `stacking_preference` / `floor_priority` / `stack_group`, drag-onto-tile cross-floor move with cascade depth 1.
- [x] **Step 07.1** — Locked-room confirmation on `− REMOVE TOP`: if the top floor contains any locked rooms, the button is replaced by an inline CANCEL / PROCEED chip listing the affected rooms. No modal, no feature additions — trust fix only.
- [x] **Step T1** — Touch input framework foundation + pan/pinch-zoom/drag retrofit. Viewport + CSS setup, `useLongPress` / `fatFingerRadius` helpers, multi-pointer tracking, pinch-to-zoom (midpoint-stable), ghost offset + finger connector on touch drag, debug gesture readout. Lock gesture (right-click/long-press) and wall scrub unchanged — those ship in T2.
- [x] **Step T2** — Touch lock gesture + touch wall scrub. `useLongPress` now owns the 500 ms room-hold timer (mouse + touch); double-tap-to-lock retired on touch. Wall scrub flips from hover-to-preview to press-to-preview on touch, with the alignment-group highlight painted during the scrub and the live area tooltip mirrored 40 px above the finger. Fat-finger pointer-down radius is 8 px on touch / 4 px on mouse (separate from the 12 px T1 hover radius). Lock chip lays out as a 2-column button grid with 36×72-min tap targets and clamps to the viewport with an 80 px thumb-zone gap at the bottom. `onContextMenu` always preventDefaults.
- [x] **Step T3** — Cross-floor drag visual feedback for touch. Drop-target ring rendered as a 4-px ring 12 px outside the tile bounds (visible around a fingertip), pulsing accent-blue on valid, static red on invalid. Dragged-room name float rendered 60 px above the finger as a `position: fixed` label so the user can confirm which room they're carrying. Floor tile activation switched from `onClick` to `onPointerDown`/`onPointerUp` with a gesture guard (`dragging_room` releases yield to the canvas's cross-floor-drop handler; everything else is a tap that switches `active_floor_index` and triggers a 250 ms tile `tap-flash`).
- [x] **v1.0.0** — Stage C (adjacency repair, cascade depth 1, max 3 iterations) + Stage D (5-weight confidence scorer — program_fit / daylight / adjacency / lock_preservation / circulation_quality, per-room + per-floor + total, red dashed outline for rooms below 0.40, low-confidence chip below 0.55 threshold). Weight sliders panel (live re-score via `recomputeScoresOnly`, logs one `WEIGHTS_CHANGED` event per pointerup). Program inputs panel (auto-discovery from building-type JSON drivers, dirty chip clears on next generate). REGENERATE button + A/B modal (only modal in the tool — side-by-side thumbnails, counts, confidence deltas, ACCEPT B / KEEP A / × CLOSE). Typed session event log with 13 event types; `SESSION_START` / `SESSION_END`, derived signals, SESSION SUMMARY chip grid with click-to-expand timeline. Four exporters (JSON / SVG / PDF via jsPDF lazy-loaded / training bundle). *(current)*

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

### Step T1 notes

Step T1 is the first of three touch retrofits (T1, T2, T3) to make the
sandbox usable on iPhone through the GitHub Pages deploy. It lays the
shared touch-input primitives every future gesture will consume and
retrofits the three existing gestures that don't require new visual
vocabulary (pan, pinch-zoom, drag-and-reflow). Lock gesture and wall
scrub stay desktop-only until T2; cross-floor drag visual feedback for
touch ships with T3.

Scope boundary: T1 is an **additive** pass. Desktop behavior is
unchanged — every mouse interaction works identically, every pointer
handler still fires the same code path. Touch-specific branches are
gated on `pointerType === "touch"`.

What T1 adds:

- **Viewport + CSS.** The viewport meta tag now includes
  `user-scalable=no, maximum-scale=1.0`; the canvas container and its
  SVG use `touch-action: none` so two-finger gestures aren't hijacked
  by Safari's browser-level pinch. Rooms, buttons, and the canvas all
  set `-webkit-user-select: none`, `-webkit-touch-callout: none`, and
  `-webkit-tap-highlight-color: transparent`.
- **Shared helpers.** `useLongPress({ durationMs, moveThresholdPx,
  onLongPress })` for T2's lock gesture; `fatFingerRadius(pointerType)`
  returning 12 px on touch, 4 px on mouse, for T2's wall hit test;
  `gestureDebugLine(gesture, activePointerCount)` for the readout.
- **Multi-pointer tracking.** `FootprintCanvas` maintains an
  `activePointersRef` map keyed by `pointerId`; size drives pinch
  detection. An `ignoredPointersRef` set suppresses stray gestures from
  pointers still down after a pinch end (they're cleared on each
  pointer's next up event).
- **Pinch-to-zoom.** Two-finger pinch on the canvas zooms the view,
  keeping the starting midpoint under the starting screen midpoint —
  matches the mouse-wheel zoom's "keep the point under the cursor"
  invariant. Works on Mac trackpad too (any two-pointer event).
- **Gesture upgrade rule.** When a second pointer lands during pan or
  drag, the single-pointer gesture is aborted and pinch takes over.
  Ghost disappears, room returns to origin, pinch starts.
- **Ghost offset for touch drag.** On touch, the drag ghost renders
  40 screen px above the finger with a thin dashed connector line, so
  the user can see the ghost around their finger. Mouse drag is
  unchanged (offset = 0).
- **Safari selection suppression.** Native non-passive `pointerdown`
  listener on the SVG calls `preventDefault()` for touch events. The
  React synthetic handler also calls `preventDefault()` — belt and
  suspenders.
- **Debug gesture readout.** Bottom-center status line shows the
  current gesture state (`idle · 0 pointers`, `panning · 1 pointer`,
  `pinching · 2 pointers · zoom 1.42`, `dragging_room <id> · at
  (u, v)`). On by default; disable with `?debug=0`. Scaffolding for
  the iPhone test session; slated to come out with T3.

What T1 deliberately does NOT do:

- Lock gesture stays as-is (right-click / 500 ms long-press /
  double-tap). T2 replaces the long-press timing with the shared
  `useLongPress` helper and adds touch-specific disambiguation.
- Wall scrub stays hover-based. On touch there's no hover, so walls
  can't currently be picked up. T2 replaces the hover-preview with a
  tap-to-arm + drag-to-scrub flow and uses `fatFingerRadius()` to
  widen the hit target.
- Cross-floor drag still uses the in-canvas ghost; on touch the ghost
  is hidden under the finger when hovering a floor tile. T3 adds a
  ring-around-finger overlay.

### Step T2 notes

Step T2 retrofits the two remaining gestures that fought Safari's default
touch behavior: the lock chip (previously right-click / long-press /
double-tap) and the wall scrub (previously hover-to-preview). Desktop
behavior is preserved — every mouse interaction works identically.

**Lock gesture.** The inline 500 ms `setTimeout` from Step 05 is gone;
all long-press logic now flows through the shared `useLongPress` helper
from T1, which handles both the timer and the 3 px move-cancel rule for
mouse and touch alike. Double-tap-to-lock is retired on touch (iOS
Safari's synthesized mouse events around taps collide with the native
double-tap-zoom gesture); it remains on desktop mouse. Right-click on
desktop is unchanged and is still the primary lock trigger there.

**Wall scrub.** On touch there's no hover, so the hover-to-preview flow
can't work. T2 replaces it with press-to-preview: a finger landing on
a scrubbable wall starts the `reproportioning` gesture at cell offset 0,
paints the alignment-group highlight immediately, and waits for the
finger to actually move before advancing. A zero-motion release is a
silent no-op (the existing `commitReproportion` short-circuits on
`cellOffset === 0`). The idle hover preview is still alive on desktop
but is now gated on `pointerType === "mouse"` so a stray Safari
pointermove can't accidentally arm it on touch.

**Fat-finger hit radius** has three distinct values by design:
- T1 hover radius: 12 px on touch, 4 px on mouse (desktop idle preview).
- T2 pointer-down radius: 8 px on touch, 4 px on mouse. Tighter than
  the hover radius so a finger clearly inside a room falls through to
  room-drag instead of hijacking into a wall scrub. If gate test 15
  reveals this is still too aggressive, the follow-up is an 80 ms delay
  after pointerdown during which movement toward a room cancels the
  wall scrub — deferred unless needed.

**Tooltip mirror axis.** The live area tooltip was positioned 12 px
below-right of the cursor on desktop; on touch the finger would cover
that region. Touch scrubs mirror the tooltip 40 px above the finger,
same sign convention as the T1 drag ghost offset.

**Lock chip.** Six reason buttons in a single row pushed the chip past
the right edge of an iPhone viewport, and each button was below Apple's
44×44 HIG minimum. T2 stacks them into a 2-column grid with a 36×72
px min tap target (applied unconditionally — the desktop chip is
slightly wider but still readable). Placement logic adds left/top/bottom
clamps with a 16 px margin and reserves 80 px at the bottom for the
thumb-resting zone (Step 09 will populate this with the weight slider
strip; until then the reservation is harmless).

**Context menu.** `onContextMenu` on the canvas SVG now preventDefaults
unconditionally — belt-and-suspenders alongside `-webkit-touch-callout:
none` and the native preventDefault on pointerdown — so iOS Safari
never pops its copy/lookup menu over the canvas. Desktop right-click
on a room still opens the lock chip; right-click on the canvas
background is now a no-op (no browser menu, no lock chip).

**Debug readout** now reports the wall id, cell offset, and affected
room count during reproportion, and the room id during the lock-chip
state, so the iPhone test session can verify gesture transitions
without console logging.

### Step T3 notes

Step T3 is the third and last touch retrofit. Cross-floor drag worked
mechanically on touch from T1 (Step 07's `document.elementFromPoint` +
`data-floor-index` attribute fires from pointer events regardless of
pointer type), but the user couldn't *see* the feedback — the finger
covers the target tile and any valid/invalid state on it. T3 adds three
visual layers plus a floor-tile tap retrofit.

**Drop-target ring.** The old 2-px dashed tile border is retired.
Instead, when the cursor/finger is over a floor tile during a room drag,
a separate ring element is rendered 12 px outside the tile on all sides
(so it spills past a fingertip). Valid targets pulse accent-blue with a
1 s ease-in-out box-shadow; invalid targets stay static red. The ring
has `pointer-events: none` so hit-testing still falls through to the
tile underneath — `document.elementFromPoint` continues to report the
right tile. Only one tile shows the ring at a time (whichever one
elementFromPoint reports), so adjacent-tile ring overlap isn't an issue.
The `.floor-strip` column keeps `overflow: visible` by default so the
outward ring isn't clipped.

**Dragged-room name float.** During `dragging_room` a small
`position: fixed` label renders 60 px above the finger with the room
name (10 px Space Mono uppercase) and department name (8 px muted).
Clamped to 8 px from the viewport edges. Rendered regardless of
pointerType — on touch it's the only way to identify the room
underneath the finger; on desktop it's still useful confirmation. Sits
above the T1 ghost (which is already offset 40 px up on touch) so both
are visible together. `pointer-events: none` so it never blocks a drop.

**Floor-tile tap disambiguation.** Floor tiles were using `onClick` for
activation. iOS Safari's 300 ms synthesized click was racing with the
canvas's pointer handlers and, in mixed drag/tap scenarios, occasionally
double-firing or missing. T3 retires `onClick` and routes activation
through `onPointerDown` + `onPointerUp`:

- `onPointerDown` on the tile calls `stopPropagation()` so a tile press
  never starts a canvas pan.
- `onPointerUp` checks the current gesture. If the gesture is
  `dragging_room`, the handler returns early — the canvas's pointer-up
  (which has pointer capture on the SVG during drag) will fire the
  cross-floor-drop logic. Otherwise it's a tap: `active_floor_index` is
  updated and a 250 ms `tap-flash` animation runs on the tile.

The tile gets `touch-action: manipulation` so iOS Safari doesn't add
its 300 ms delay. The pointer-capture on the SVG during drag means the
tile's `onPointerUp` normally won't fire mid-drag at all — the gesture
check is a belt-and-suspenders guard in case capture fails (e.g. after
a pinch-upgrade cancels the drag).

**Debug readout** now appends `· over floor tile N` or
`· over floor tile N · INVALID` during `dragging_room` when the finger
is over a tile, so the iPhone tester can verify the `elementFromPoint`
hit path without needing to see the ring.

**Finger position in viewport coords.** The drag gesture state now
carries both `fingerScreen` (container-relative, used by the T1 SVG
connector line) and `fingerClient` (viewport-relative, used by the
`position: fixed` room-name float).

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
