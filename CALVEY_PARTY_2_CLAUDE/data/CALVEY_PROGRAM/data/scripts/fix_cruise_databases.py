#!/usr/bin/env python3
"""
Fix broken cruise terminal database files for CALVEY PARTI v10.

Phases 1A-1E:
  A) Recompute parti_area_cells from area_sf proportions
  B) Assign proper department_groups by category
  C) Generate adjacency_edges for all 3 cruise files
  D) (included in C for cruiseport)
  E) Fix zone and daylight fields
"""
import json, os, math, copy

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

# ── Category → department/zone/daylight mappings (for cruise_day & non_cruise_day) ──

CATEGORY_DEPT = {
    "A": "Public",
    "B": "Processing",
    "C": "Support",
    "D": "Core",
    "E": "Workspace",
    "F": "Core",
    "G": "Support",
}

CATEGORY_ZONE = {
    "A": "foh",
    "B": "foh",
    "C": "support",
    "D": "core",
    "E": "support",
    "F": "core",
    "G": "foh",
}

# Daylight: True for category A (except A.02) and B (except B.02), G.03
DAYLIGHT_EXCEPTIONS_TRUE = {"G.03"}  # Pet Relief = true
DAYLIGHT_EXCEPTIONS_FALSE = {"A.02", "B.02"}  # Security, FIS = false

def get_daylight(space_id, category):
    if space_id in DAYLIGHT_EXCEPTIONS_TRUE:
        return True
    if space_id in DAYLIGHT_EXCEPTIONS_FALSE:
        return False
    if category in ("A", "B"):
        return True
    return False

# ── Department palette for cruise_day & non_cruise_day ──

CRUISE_DAY_PALETTE = [
    {"department_group": "Public", "color": "#B07D4A", "placement_strategy": "entry"},
    {"department_group": "Processing", "color": "#4D8F4D", "placement_strategy": "wing"},
    {"department_group": "Support", "color": "#4A7FA8", "placement_strategy": "bridge"},
    {"department_group": "Core", "color": "#6B6B6B", "placement_strategy": "service"},
    {"department_group": "Workspace", "color": "#4A7FA8", "placement_strategy": "wing"},
]

# For non_cruise_day, map categories differently for the civic/event mode
NON_CRUISE_CATEGORY_DEPT = {
    "A": "Public",       # Event spaces → Public
    "B": "Meeting",      # Community/recreation → Meeting
    "C": "Support",      # Staging/storage → Support
    "D": "Core",         # Circulation → Core
    "E": "Workspace",    # Operations → Workspace
    "F": "Core",         # MEP → Core
    "G": "Support",      # Amenities → Support
}

NON_CRUISE_PALETTE = [
    {"department_group": "Public", "color": "#B07D4A", "placement_strategy": "entry"},
    {"department_group": "Meeting", "color": "#4D8F4D", "placement_strategy": "bridge"},
    {"department_group": "Support", "color": "#4A7FA8", "placement_strategy": "service"},
    {"department_group": "Core", "color": "#6B6B6B", "placement_strategy": "service"},
    {"department_group": "Workspace", "color": "#4A7FA8", "placement_strategy": "wing"},
]

# ── Adjacency edge generation ──

def parse_adjacency_notes_cruise_day(spaces):
    """Generate adjacency edges from cruise_day adjacency_notes and logical chains."""
    edges = []
    id_set = {s["id"] for s in spaces}

    # Parse adjacency_notes for explicit references
    for space in spaces:
        sid = space["id"]
        notes = space.get("adjacency_notes", "") or ""

        # Look for references to space IDs like "A.02", "B.03", etc.
        import re
        refs = re.findall(r'([A-G]\.\d{2})', notes)
        for ref in refs:
            if ref in id_set and ref != sid:
                weight = 3 if any(w in notes.lower() for w in ["direct", "adjacent", "between", "feed"]) else 2
                rel = "must_adjoin" if weight == 3 else "should_adjoin"
                edge = {"from": sid, "to": ref, "weight": weight, "relationship": rel}
                # Avoid duplicates
                if not any(e["from"] == sid and e["to"] == ref for e in edges):
                    edges.append(edge)

        # Look for name references (partial matches)
        for other in spaces:
            if other["id"] == sid:
                continue
            # Check if other space's name fragment appears in notes
            name_parts = other["name"].split("/")[0].strip().split("(")[0].strip()
            if len(name_parts) > 4 and name_parts.lower() in notes.lower():
                weight = 2 if any(w in notes.lower() for w in ["near", "close"]) else 1
                rel = "should_adjoin" if weight >= 2 else "near"
                if not any(e["from"] == sid and e["to"] == other["id"] for e in edges):
                    edges.append({"from": sid, "to": other["id"], "weight": weight, "relationship": rel})

    # ── Logical adjacency chains ──

    # Embarkation sequence: A.01→A.02→A.03→A.04→A.05→A.06→A.07
    embark_chain = ["A.01", "A.02", "A.03", "A.05", "A.07"]
    for i in range(len(embark_chain) - 1):
        add_edge_if_missing(edges, embark_chain[i], embark_chain[i+1], 3, "must_adjoin")

    # A.04 VIP near A.07 Boarding and A.03 Holding
    add_edge_if_missing(edges, "A.04", "A.07", 2, "should_adjoin")
    add_edge_if_missing(edges, "A.04", "A.03", 2, "should_adjoin")

    # A.06 Family near elevators D.01
    add_edge_if_missing(edges, "A.06", "D.01", 2, "should_adjoin")

    # Debarkation chain: B.01→B.02→B.03→B.04
    debark_chain = ["B.01", "B.02", "B.03", "B.04"]
    for i in range(len(debark_chain) - 1):
        add_edge_if_missing(edges, debark_chain[i], debark_chain[i+1], 3, "must_adjoin")

    # Baggage: C.02 feeds B.03
    add_edge_if_missing(edges, "C.02", "B.03", 3, "must_adjoin")
    # C.01 near C.03 BHS
    add_edge_if_missing(edges, "C.01", "C.03", 2, "should_adjoin")
    add_edge_if_missing(edges, "C.02", "C.03", 2, "should_adjoin")
    # C.04 near C.01 and E.06
    add_edge_if_missing(edges, "C.04", "C.01", 2, "should_adjoin")
    add_edge_if_missing(edges, "C.04", "E.06", 2, "should_adjoin")

    # Vertical circulation interconnects
    d_spaces = [s["id"] for s in spaces if s["category"] == "D"]
    for i in range(len(d_spaces)):
        for j in range(i+1, len(d_spaces)):
            add_edge_if_missing(edges, d_spaces[i], d_spaces[j], 1, "near")

    # Public restrooms near circulation
    add_edge_if_missing(edges, "G.01", "D.01", 2, "should_adjoin")
    add_edge_if_missing(edges, "G.01", "D.02", 2, "should_adjoin")

    # G.02 Nursing near A.06 Family
    add_edge_if_missing(edges, "G.02", "A.06", 2, "should_adjoin")

    # MEP cluster
    mep_spaces = [s["id"] for s in spaces if s["category"] == "F"]
    for i in range(len(mep_spaces)):
        for j in range(i+1, len(mep_spaces)):
            add_edge_if_missing(edges, mep_spaces[i], mep_spaces[j], 1, "near")

    # F.01 near F.05 (Electrical near Generator)
    add_edge_if_missing(edges, "F.01", "F.05", 3, "must_adjoin")

    # E.02 CBP near B.02 FIS
    add_edge_if_missing(edges, "E.02", "B.02", 3, "must_adjoin")

    # E.01 near E.06 (Operations near Loading Dock)
    add_edge_if_missing(edges, "E.01", "E.06", 2, "should_adjoin")

    # E.04 near E.01 and E.02
    add_edge_if_missing(edges, "E.04", "E.01", 2, "should_adjoin")
    add_edge_if_missing(edges, "E.04", "E.02", 2, "should_adjoin")

    # D.04 Service Elevator near E.06 Loading Dock
    add_edge_if_missing(edges, "D.04", "E.06", 2, "should_adjoin")

    # D.03 Monumental Stair visible from A.01
    add_edge_if_missing(edges, "D.03", "A.01", 2, "should_adjoin")

    return edges


def parse_adjacency_notes_cruiseport(spaces):
    """Generate adjacency edges for the cruiseport file using its CT_* IDs."""
    edges = []
    id_set = {s["id"] for s in spaces}

    # Parse adjacency_notes for name-based references
    for space in spaces:
        sid = space["id"]
        notes = space.get("adjacency_notes", "") or ""
        if not notes:
            continue

        for other in spaces:
            if other["id"] == sid:
                continue
            # Check if other's short name appears in notes
            short_name = other["name"].split("(")[0].split("/")[0].strip()
            if len(short_name) > 4 and short_name.lower() in notes.lower():
                weight = 3 if any(w in notes.lower() for w in ["direct", "adjacent", "feeds"]) else 2
                rel = "must_adjoin" if weight == 3 else "should_adjoin"
                if not any(e["from"] == sid and e["to"] == other["id"] for e in edges):
                    edges.append({"from": sid, "to": other["id"], "weight": weight, "relationship": rel})

    # Embarkation chain
    embark = ["CT_CHECKIN_HALL", "CT_SECURITY", "CT_HOLDING", "CT_BOARDING"]
    for i in range(len(embark) - 1):
        add_edge_if_missing(edges, embark[i], embark[i+1], 3, "must_adjoin")

    # Holding area connections
    add_edge_if_missing(edges, "CT_HOLDING", "CT_VIP_LOUNGE", 2, "should_adjoin")
    add_edge_if_missing(edges, "CT_HOLDING", "CT_RETAIL_FB", 2, "should_adjoin")
    add_edge_if_missing(edges, "CT_HOLDING", "CT_FAMILY_WAIT", 2, "should_adjoin")

    # VIP near Boarding
    add_edge_if_missing(edges, "CT_VIP_LOUNGE", "CT_BOARDING", 2, "should_adjoin")

    # Family near elevators
    add_edge_if_missing(edges, "CT_FAMILY_WAIT", "CT_ELEVATORS", 2, "should_adjoin")

    # Debarkation chain
    debark = ["CT_DEBARK_RAMP", "CT_FIS", "CT_BAGGAGE_CLAIM", "CT_MEETER_GREETER"]
    for i in range(len(debark) - 1):
        add_edge_if_missing(edges, debark[i], debark[i+1], 3, "must_adjoin")

    # Baggage logistics
    add_edge_if_missing(edges, "CT_LUGGAGE_DEBARK", "CT_BAGGAGE_CLAIM", 3, "must_adjoin")
    add_edge_if_missing(edges, "CT_LUGGAGE_EMBARK", "CT_BHS_EQUIP", 2, "should_adjoin")
    add_edge_if_missing(edges, "CT_LUGGAGE_DEBARK", "CT_BHS_EQUIP", 2, "should_adjoin")
    add_edge_if_missing(edges, "CT_CART_STORAGE", "CT_LUGGAGE_EMBARK", 2, "should_adjoin")
    add_edge_if_missing(edges, "CT_CART_STORAGE", "CT_LOADING_DOCK", 2, "should_adjoin")

    # Vertical circulation interconnects
    circ = ["CT_ELEVATORS", "CT_ESCALATORS", "CT_MONUMENT_STAIR", "CT_SERVICE_ELEV", "CT_EGRESS_STAIRS"]
    for i in range(len(circ)):
        for j in range(i+1, len(circ)):
            add_edge_if_missing(edges, circ[i], circ[j], 1, "near")

    # Restrooms near circulation
    add_edge_if_missing(edges, "CT_RESTROOMS", "CT_ELEVATORS", 2, "should_adjoin")
    add_edge_if_missing(edges, "CT_RESTROOMS", "CT_ESCALATORS", 2, "should_adjoin")

    # Nursing near Family
    add_edge_if_missing(edges, "CT_NURSING", "CT_FAMILY_WAIT", 2, "should_adjoin")

    # MEP cluster
    mep = ["CT_ELECTRICAL", "CT_HVAC", "CT_FIRE_PUMP", "CT_IT_TELECOM", "CT_GENERATOR", "CT_ELEV_MACHINE"]
    for i in range(len(mep)):
        for j in range(i+1, len(mep)):
            add_edge_if_missing(edges, mep[i], mep[j], 1, "near")
    add_edge_if_missing(edges, "CT_ELECTRICAL", "CT_GENERATOR", 3, "must_adjoin")

    # Operations
    add_edge_if_missing(edges, "CT_CBP_OFFICES", "CT_FIS", 3, "must_adjoin")
    add_edge_if_missing(edges, "CT_TERMINAL_OPS", "CT_LOADING_DOCK", 2, "should_adjoin")
    add_edge_if_missing(edges, "CT_STAFF_BREAK", "CT_TERMINAL_OPS", 2, "should_adjoin")
    add_edge_if_missing(edges, "CT_STAFF_BREAK", "CT_CBP_OFFICES", 2, "should_adjoin")
    add_edge_if_missing(edges, "CT_SERVICE_ELEV", "CT_LOADING_DOCK", 2, "should_adjoin")

    # Monumental stair in lobby
    add_edge_if_missing(edges, "CT_MONUMENT_STAIR", "CT_CHECKIN_HALL", 2, "should_adjoin")

    return edges


def parse_adjacency_notes_non_cruise(spaces):
    """Generate adjacency edges for non_cruise_day using logical spatial relationships."""
    edges = []

    # Event flow: A.01 Reception → A.02 Open Floor → A.03 Premier Hall
    add_edge_if_missing(edges, "A.01", "A.02", 3, "must_adjoin")
    add_edge_if_missing(edges, "A.02", "A.03", 2, "should_adjoin")
    add_edge_if_missing(edges, "A.01", "A.05", 2, "should_adjoin")  # Reception near Restaurant
    add_edge_if_missing(edges, "A.04", "A.03", 2, "should_adjoin")  # Private Suite near Premier Hall
    add_edge_if_missing(edges, "A.06", "D.01", 2, "should_adjoin")  # Wellness near Elevators
    add_edge_if_missing(edges, "A.07", "A.03", 2, "should_adjoin")  # Terrace near Premier Hall

    # Community/Recreation: B.02 near B.03, B.04 near B.03
    add_edge_if_missing(edges, "B.02", "B.03", 2, "should_adjoin")
    add_edge_if_missing(edges, "B.03", "B.04", 2, "should_adjoin")
    add_edge_if_missing(edges, "B.01", "B.02", 2, "should_adjoin")

    # Staging: C.01 near C.02, C.04 near C.01
    add_edge_if_missing(edges, "C.01", "C.02", 2, "should_adjoin")
    add_edge_if_missing(edges, "C.04", "C.01", 2, "should_adjoin")
    add_edge_if_missing(edges, "C.01", "E.06", 2, "should_adjoin")  # Staging near Load-In

    # Vertical circulation
    d_spaces = ["D.01", "D.02", "D.03", "D.04", "D.05"]
    for i in range(len(d_spaces)):
        for j in range(i+1, len(d_spaces)):
            add_edge_if_missing(edges, d_spaces[i], d_spaces[j], 1, "near")

    # Restrooms near circulation
    add_edge_if_missing(edges, "G.01", "D.01", 2, "should_adjoin")
    add_edge_if_missing(edges, "G.01", "D.02", 2, "should_adjoin")

    # Operations
    add_edge_if_missing(edges, "E.01", "E.03", 2, "should_adjoin")
    add_edge_if_missing(edges, "E.04", "E.01", 2, "should_adjoin")
    add_edge_if_missing(edges, "E.01", "E.06", 2, "should_adjoin")
    add_edge_if_missing(edges, "D.04", "E.06", 2, "should_adjoin")
    add_edge_if_missing(edges, "D.03", "A.01", 2, "should_adjoin")

    # MEP cluster
    mep = ["F.01", "F.02", "F.03", "F.04", "F.05", "F.06"]
    for i in range(len(mep)):
        for j in range(i+1, len(mep)):
            add_edge_if_missing(edges, mep[i], mep[j], 1, "near")
    add_edge_if_missing(edges, "F.01", "F.05", 3, "must_adjoin")

    # G.02 near A.06
    add_edge_if_missing(edges, "G.02", "A.06", 2, "should_adjoin")

    return edges


def add_edge_if_missing(edges, from_id, to_id, weight, relationship):
    """Add edge if no edge exists between from_id and to_id in either direction."""
    for e in edges:
        if (e["from"] == from_id and e["to"] == to_id) or \
           (e["from"] == to_id and e["to"] == from_id):
            # Upgrade weight if new is higher
            if weight > e["weight"]:
                e["weight"] = weight
                e["relationship"] = relationship
            return
    edges.append({"from": from_id, "to": to_id, "weight": weight, "relationship": relationship})


def compute_area_cells(spaces, budget=700):
    """Compute parti_area_cells proportionally from area_sf."""
    total_sf = sum(s["area_sf"] for s in spaces)
    cells_map = {}
    for s in spaces:
        proportion = s["area_sf"] / total_sf
        cells = max(1, round(proportion * budget))
        cells_map[s["id"]] = cells
    return cells_map


def edges_to_overrides(edges, id_to_name):
    """Convert building-level edges (by ID) to variant-level overrides (by name)."""
    overrides = []
    seen = set()
    for e in edges:
        fn = id_to_name.get(e["from"], "")
        tn = id_to_name.get(e["to"], "")
        if not fn or not tn:
            continue
        key = tuple(sorted([fn, tn]))
        if key in seen:
            continue
        seen.add(key)
        overrides.append({
            "from_name": fn,
            "to_name": tn,
            "weight": e["weight"],
            "relationship": e["relationship"]
        })
    return overrides


# ═══════════════════════════════════════════════════════════════
# FIX 1: cruise_terminal_cruise_day.json
# ═══════════════════════════════════════════════════════════════

print("=" * 60)
print("Fixing: program_database_cruise_terminal_cruise_day.json")
print("=" * 60)

with open("program_database_cruise_terminal_cruise_day.json") as f:
    cd = json.load(f)

spaces_cd = cd["space_library"]
cells_cd = compute_area_cells(spaces_cd, 700)

# Build ID→name map
id_to_name_cd = {s["id"]: s["parti"]["parti_name"] for s in spaces_cd}

# Fix space_library parti blocks
for s in spaces_cd:
    sid = s["id"]
    cat = s["category"]
    s["parti"]["parti_area_cells"] = cells_cd[sid]
    s["parti"]["department_group"] = CATEGORY_DEPT[cat]
    s["parti"]["placement_zone"] = CATEGORY_ZONE[cat]
    s["parti"]["daylight_required"] = get_daylight(sid, cat)
    print(f"  {sid} {s['name'][:40]:40s} cells={cells_cd[sid]:3d} dept={CATEGORY_DEPT[cat]:12s} zone={CATEGORY_ZONE[cat]:8s} daylight={get_daylight(sid, cat)}")

# Generate adjacency edges at building level
edges_cd = parse_adjacency_notes_cruise_day(spaces_cd)
cd["adjacency_edges"] = edges_cd
print(f"  Generated {len(edges_cd)} adjacency edges")

# Fix variant
variant = cd["parti_config"]["variants"]["Cruise Terminal"]
variant["department_palette"] = CRUISE_DAY_PALETTE

# Fix room_selection entries
for rs in variant["room_selection"]:
    sid = rs["space_id"]
    cat = next((s["category"] for s in spaces_cd if s["id"] == sid), "C")
    rs["parti_area_cells"] = cells_cd[sid]
    rs["department_group"] = CATEGORY_DEPT[cat]
    rs["placement_zone"] = CATEGORY_ZONE[cat]
    rs["daylight_required"] = get_daylight(sid, cat)

# Generate adjacency overrides for variant
variant["adjacency_overrides"] = edges_to_overrides(edges_cd, id_to_name_cd)
print(f"  Generated {len(variant['adjacency_overrides'])} adjacency overrides")

# Update top-level department_palette too
cd["parti_config"]["department_palette"] = CRUISE_DAY_PALETTE

with open("program_database_cruise_terminal_cruise_day.json", "w") as f:
    json.dump(cd, f, indent=2, ensure_ascii=False)
    f.write("\n")
print("  ✓ Saved\n")


# ═══════════════════════════════════════════════════════════════
# FIX 2: cruise_terminal_non_cruise_day.json
# ═══════════════════════════════════════════════════════════════

print("=" * 60)
print("Fixing: program_database_cruise_terminal_non_cruise_day.json")
print("=" * 60)

with open("program_database_cruise_terminal_non_cruise_day.json") as f:
    ncd = json.load(f)

spaces_ncd = ncd["space_library"]
cells_ncd = compute_area_cells(spaces_ncd, 700)

id_to_name_ncd = {s["id"]: s["parti"]["parti_name"] for s in spaces_ncd}

for s in spaces_ncd:
    sid = s["id"]
    cat = s["category"]
    s["parti"]["parti_area_cells"] = cells_ncd[sid]
    s["parti"]["department_group"] = NON_CRUISE_CATEGORY_DEPT[cat]
    s["parti"]["placement_zone"] = CATEGORY_ZONE[cat]
    s["parti"]["daylight_required"] = get_daylight(sid, cat)
    print(f"  {sid} {s['name'][:40]:40s} cells={cells_ncd[sid]:3d} dept={NON_CRUISE_CATEGORY_DEPT[cat]:12s} zone={CATEGORY_ZONE[cat]:8s} daylight={get_daylight(sid, cat)}")

edges_ncd = parse_adjacency_notes_non_cruise(spaces_ncd)
ncd["adjacency_edges"] = edges_ncd
print(f"  Generated {len(edges_ncd)} adjacency edges")

variant_ncd = ncd["parti_config"]["variants"]["Multi-Use Civic Venue"]
variant_ncd["department_palette"] = NON_CRUISE_PALETTE

for rs in variant_ncd["room_selection"]:
    sid = rs["space_id"]
    cat = next((s["category"] for s in spaces_ncd if s["id"] == sid), "C")
    rs["parti_area_cells"] = cells_ncd[sid]
    rs["department_group"] = NON_CRUISE_CATEGORY_DEPT[cat]
    rs["placement_zone"] = CATEGORY_ZONE[cat]
    rs["daylight_required"] = get_daylight(sid, cat)

variant_ncd["adjacency_overrides"] = edges_to_overrides(edges_ncd, id_to_name_ncd)
print(f"  Generated {len(variant_ncd['adjacency_overrides'])} adjacency overrides")

ncd["parti_config"]["department_palette"] = NON_CRUISE_PALETTE

with open("program_database_cruise_terminal_non_cruise_day.json", "w") as f:
    json.dump(ncd, f, indent=2, ensure_ascii=False)
    f.write("\n")
print("  ✓ Saved\n")


# ═══════════════════════════════════════════════════════════════
# FIX 3: cruiseport.json — only adjacency edges needed
# ═══════════════════════════════════════════════════════════════

print("=" * 60)
print("Fixing: program_database_cruiseport.json")
print("=" * 60)

with open("program_database_cruiseport.json") as f:
    cp = json.load(f)

spaces_cp = cp["space_library"]
id_to_name_cp = {s["id"]: s.get("parti", {}).get("parti_name", s["name"]) for s in spaces_cp}

edges_cp = parse_adjacency_notes_cruiseport(spaces_cp)
cp["adjacency_edges"] = edges_cp
print(f"  Generated {len(edges_cp)} adjacency edges")

variant_cp = cp["parti_config"]["variants"]["Cruise Terminal"]
variant_cp["adjacency_overrides"] = edges_to_overrides(edges_cp, id_to_name_cp)
print(f"  Generated {len(variant_cp['adjacency_overrides'])} adjacency overrides")

with open("program_database_cruiseport.json", "w") as f:
    json.dump(cp, f, indent=2, ensure_ascii=False)
    f.write("\n")
print("  ✓ Saved\n")


# ═══════════════════════════════════════════════════════════════
# VALIDATION SUMMARY
# ═══════════════════════════════════════════════════════════════

print("=" * 60)
print("VALIDATION SUMMARY")
print("=" * 60)

for label, filepath in [
    ("Cruise Day", "program_database_cruise_terminal_cruise_day.json"),
    ("Non-Cruise Day", "program_database_cruise_terminal_non_cruise_day.json"),
    ("Cruiseport", "program_database_cruiseport.json"),
]:
    data = json.load(open(filepath))
    spaces = data["space_library"]
    edges = data.get("adjacency_edges", [])

    cells = [s["parti"]["parti_area_cells"] for s in spaces]
    depts = set(s["parti"]["department_group"] for s in spaces)
    zones = set(s["parti"]["placement_zone"] for s in spaces)
    daylight_count = sum(1 for s in spaces if s["parti"]["daylight_required"])

    # Check variant
    pc = data["parti_config"]
    variants = pc.get("variants", {})
    for vname, v in variants.items():
        rs = v.get("room_selection", [])
        rs_cells = [r["parti_area_cells"] for r in rs]
        rs_depts = set(r["department_group"] for r in rs)
        ao = v.get("adjacency_overrides", [])

        print(f"\n{label} → variant '{vname}':")
        print(f"  Spaces: {len(spaces)}, Edges: {len(edges)}")
        print(f"  Cell range: {min(cells)}–{max(cells)}, Total: {sum(cells)}")
        print(f"  Departments: {sorted(depts)}")
        print(f"  Zones: {sorted(zones)}")
        print(f"  Daylight-required count: {daylight_count}")
        print(f"  Room selection cells range: {min(rs_cells)}–{max(rs_cells)}, Total: {sum(rs_cells)}")
        print(f"  Room selection depts: {sorted(rs_depts)}")
        print(f"  Adjacency overrides: {len(ao)}")
