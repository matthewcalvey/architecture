#!/usr/bin/env python3
"""
Compile v4 program database into parti_runtime_v4.json for CALVEY PARTI.

Reads all program_database_*_v4.json files, extracts parti_config blocks,
and compiles into a unified runtime file that PARTI v9 can load directly.

Usage: python3 scripts/compile_parti_runtime.py
Output: parti_runtime_v4.json (in v4 directory)
"""
import json, glob, os, sys
from datetime import date

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))


def normalize_level(raw):
    """Normalize level strings to canonical values: ground, upper, all, or None."""
    if not raw:
        return None
    s = raw.strip().lower()

    # "all" / "both" / "multi-level"
    if s in ("all", "both", "multi-level", "multi-level"):
        return "all"
    # Ground-level aliases
    if s in ("grade", "ground", "grade level", "ground level"):
        return "ground"
    # Upper-level aliases
    if s in ("upper", "upper level"):
        return "upper"
    # Compound: "Upper to Grade", "Grade/Roof", etc. — take first part
    if "→" in s:
        return normalize_level(s.split("→")[0])
    if " to " in s:
        return normalize_level(s.split(" to ")[0])
    if "/" in s:
        return normalize_level(s.split("/")[0])
    if " or " in s:
        return normalize_level(s.split(" or ")[0])
    # Roof → upper
    if "roof" in s or "penthouse" in s:
        return "upper"
    # Elevated → upper
    if "elevated" in s:
        return "upper"
    return None


files = sorted(glob.glob("program_database_*.json"))
programs = {}

def build_adj_map(adj_overrides, room_selection):
    """Build adjacency map from adjacency_overrides, keyed by parti_name."""
    adj_map = {}  # parti_name -> list of other parti_names

    if adj_overrides:
        for ao in adj_overrides:
            # Support both from_name/to_name (v0.5) and from/to (v4) keys
            fn = ao.get("from_name") or ao.get("from", "")
            tn = ao.get("to_name") or ao.get("to", "")
            if fn and tn:
                adj_map.setdefault(fn, [])
                adj_map.setdefault(tn, [])
                if tn not in adj_map[fn]:
                    adj_map[fn].append(tn)
                if fn not in adj_map[tn]:
                    adj_map[tn].append(fn)
        return adj_map

    # Fallback: build from space-level adjacencies using parti_name lookup
    # Build space_id -> parti_name map
    id_to_name = {}
    for rs in room_selection:
        sid = rs.get("space_id", "")
        pname = rs.get("parti_name", "")
        if sid and pname:
            id_to_name[sid] = pname

    return adj_map


def build_adj_from_edges(adjacency_edges, space_library, room_selection):
    """Build adjacency map from building-level adjacency_edges."""
    # Build space_id -> parti_name map from room_selection
    id_to_name = {}
    for rs in room_selection:
        sid = rs.get("space_id", "")
        pname = rs.get("parti_name", "")
        if sid and pname:
            id_to_name[sid] = pname

    # Also build from space_library parti blocks
    for space in space_library:
        sid = space.get("id", "")
        parti = space.get("parti", {})
        pname = parti.get("parti_name", "")
        if sid and pname and sid not in id_to_name:
            id_to_name[sid] = pname

    adj_map = {}
    adj_overrides = []

    for edge in adjacency_edges:
        from_id = edge.get("from", "")
        to_id = edge.get("to", "")
        from_name = id_to_name.get(from_id, "")
        to_name = id_to_name.get(to_id, "")
        if not from_name or not to_name:
            continue
        if from_name == to_name:
            continue

        weight = edge.get("weight", 2)
        relationship = edge.get("relationship", "near")

        adj_map.setdefault(from_name, [])
        adj_map.setdefault(to_name, [])
        if to_name not in adj_map[from_name]:
            adj_map[from_name].append(to_name)
        if from_name not in adj_map[to_name]:
            adj_map[to_name].append(from_name)

        adj_overrides.append({
            "from": from_name,
            "to": to_name,
            "weight": weight,
            "relationship": relationship
        })

    return adj_map, adj_overrides


def compile_sequences(space_sequences, space_library, room_selection):
    """Compile space_sequences into parti-ready format with parti_name lookups."""
    if not space_sequences:
        return []

    # Build space_id -> parti_name map
    id_to_name = {}
    for rs in room_selection:
        sid = rs.get("space_id", "")
        pname = rs.get("parti_name", "")
        if sid and pname:
            id_to_name[sid] = pname
    for space in space_library:
        sid = space.get("id", "")
        parti = space.get("parti", {})
        pname = parti.get("parti_name", "")
        if sid and pname and sid not in id_to_name:
            id_to_name[sid] = pname

    compiled = []
    for seq in space_sequences:
        steps = []
        for step in seq.get("steps", []):
            space_id = step.get("space_id", "")
            parti_name = id_to_name.get(space_id, "")
            steps.append({
                "seq": step.get("seq", 0),
                "space_id": space_id,
                "name": parti_name,
                "dwell": step.get("dwell"),
                "checkpoint": step.get("checkpoint", False),
                "branch_to": step.get("branch_to")
            })

        compiled.append({
            "id": seq.get("id", ""),
            "name": seq.get("name", ""),
            "flow_type": seq.get("flow_type", ""),
            "direction": seq.get("direction", "one_way"),
            "level": seq.get("level"),
            "description": seq.get("description", ""),
            "steps": steps,
            "constraints": seq.get("constraints", {})
        })

    return compiled


def convert_variant(variant_cfg, space_library, adjacency_edges, plan_archetypes, space_sequences=None):
    """Convert a single PARTI variant config into the runtime format."""
    room_selection = variant_cfg.get("room_selection", [])
    adj_overrides_raw = variant_cfg.get("adjacency_overrides", [])

    # Build adjacency data
    if adj_overrides_raw:
        adj_map = build_adj_map(adj_overrides_raw, room_selection)
        adj_overrides_out = []
        for ao in adj_overrides_raw:
            adj_overrides_out.append({
                "from": ao.get("from_name") or ao.get("from", ""),
                "to": ao.get("to_name") or ao.get("to", ""),
                "weight": ao.get("weight", 2),
                "relationship": ao.get("relationship", "near")
            })
    else:
        # Build from building-level adjacency_edges
        adj_map, adj_overrides_out = build_adj_from_edges(
            adjacency_edges, space_library, room_selection
        )

    # Build space_id -> space lookup for scaling data
    space_lookup = {s["id"]: s for s in space_library}

    # Convert rooms
    rooms = []
    for rs in room_selection:
        pname = rs.get("parti_name", "")
        if pname == "Corridor":
            continue

        space_id = rs.get("space_id", "")
        space = space_lookup.get(space_id, {})
        scaling = space.get("scaling", {})

        # Normalize floor/level field from space_library
        raw_level = space.get("level") or rs.get("level") or None
        floor_val = normalize_level(raw_level) if raw_level else None

        room = {
            "space_id": space_id,
            "name": pname,
            "dept": rs.get("department_group", "Support"),
            "zone": rs.get("placement_zone", "support"),
            "area": rs.get("parti_area_cells", rs.get("parti_area", 6)),
            "daylight": rs.get("daylight_required", False),
            "adj": adj_map.get(pname, []),
            "minW": rs.get("min_width_cells", 2),
            "minH": rs.get("min_depth_cells", 2),
            "maxAspect": rs.get("max_aspect_ratio", 3),
            "placePref": rs.get("corridor_placement_pref"),
            "scaling_class": scaling.get("class", "fixed"),
            "priority_rank": scaling.get("priority_rank", 3),
            "floor": floor_val
        }
        rooms.append(room)

    # Department palette
    dept_palette = []
    for dp in variant_cfg.get("department_palette", []):
        dept_palette.append({
            "department_group": dp.get("department_group", ""),
            "color": dp.get("color", "#6B6B6B"),
            "placement_strategy": dp.get("placement_strategy", "")
        })

    # Compile space sequences if present
    sequences = compile_sequences(
        space_sequences or [],
        space_library,
        room_selection
    )

    result = {
        "sf_range": variant_cfg.get("sf_range", [5000, 50000]),
        "sf_default": variant_cfg.get("sf_default", 25000),
        "grossing_factor": variant_cfg.get("grossing_factor", 1.35),
        "icon": variant_cfg.get("icon", "🏢"),
        "corridor_typology": variant_cfg.get("corridor_typology", "linear"),
        "plan_archetype": plan_archetypes.get("primary", "bar") if isinstance(plan_archetypes, dict) else "bar",
        "department_palette": dept_palette,
        "rooms": rooms,
        "adjacency_overrides": adj_overrides_out,
        "sequences": sequences
    }
    return result


# Process each building type file
for filepath in files:
    data = json.load(open(filepath))
    fname = os.path.basename(filepath)

    if "parti_config" not in data:
        print(f"  SKIP (no parti_config): {fname}")
        continue

    pc = data["parti_config"]
    space_library = data.get("space_library", [])
    adjacency_edges = data.get("adjacency_edges", [])
    plan_archetypes = data.get("plan_archetypes", {})
    space_sequences = data.get("space_sequences", [])
    bt = data.get("building_type", fname)

    variants = pc.get("variants", {})

    # Top-level parti_config fields that apply to all variants
    top_level = {
        "sf_range": pc.get("sf_range", [5000, 50000]),
        "sf_default": pc.get("sf_default", 25000),
        "grossing_factor": pc.get("grossing_factor", 1.35),
        "icon": pc.get("icon", "🏢"),
        "corridor_typology": pc.get("corridor_typology", "linear"),
        "department_palette": pc.get("department_palette", []),
    }

    if isinstance(variants, dict) and variants:
        for variant_key, variant_cfg in variants.items():
            # Merge top-level fields into variant (variant fields take precedence)
            merged = {**top_level, **variant_cfg}
            program = convert_variant(merged, space_library, adjacency_edges, plan_archetypes, space_sequences)
            # Disambiguate duplicate keys using filename hint
            out_key = variant_key
            if out_key in programs:
                # Derive suffix from filename (e.g. "cruiseport" → "Cruiseport")
                stem = fname.replace("program_database_", "").replace(".json", "")
                suffix = stem.replace("_", " ").title()
                out_key = f"{variant_key} ({suffix})"
            programs[out_key] = program
            seq_count = len(program.get('sequences', []))
            print(f"  {fname} → variant '{out_key}': {len(program['rooms'])} rooms, {len(program['department_palette'])} depts, {seq_count} sequences")
    else:
        variant_cfg = {
            **top_level,
            "room_selection": pc.get("room_selection", []),
            "adjacency_overrides": pc.get("adjacency_overrides", []),
        }
        program = convert_variant(variant_cfg, space_library, adjacency_edges, plan_archetypes, space_sequences)
        programs[bt] = program
        seq_count = len(program.get('sequences', []))
        print(f"  {fname} → '{bt}': {len(program['rooms'])} rooms, {len(program['department_palette'])} depts, {seq_count} sequences")

# Build output
output = {
    "schema_version": "4.0",
    "compiled_date": str(date.today()),
    "source": "CALVEY_PROGRAM v4",
    "programs": programs
}

outpath = "parti_runtime.json"
with open(outpath, "w") as f:
    json.dump(output, f, indent=2, ensure_ascii=False)
    f.write("\n")

# Summary
total_rooms = sum(len(p["rooms"]) for p in programs.values())
print(f"\nCompiled {len(programs)} programs with {total_rooms} total rooms to {outpath}")
print(f"Programs: {sorted(programs.keys())}")
