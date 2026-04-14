#!/usr/bin/env python3
"""Post-patch Phase 6: Full validation of v4 database after all phases."""
import json, glob, os, sys

os.chdir(os.path.dirname(os.path.abspath(__file__)))

results = {}
all_pass = True

def check(name, passed, details=""):
    global all_pass
    results[name] = {"passed": passed, "details": details}
    status = "PASS" if passed else "FAIL"
    print(f"  [{status}] {name}")
    if details and not passed:
        for line in details.split("\n")[:10]:
            print(f"         {line}")
    if not passed:
        all_pass = False

print("=" * 70)
print("CALVEY PROGRAM DATABASE v4 — POST-PATCH VALIDATION REPORT")
print("=" * 70)

# Load all files
files = sorted(glob.glob("program_database_*_v4.json"))
all_spaces = []
all_edges = []
file_data = {}

for filepath in files:
    data = json.load(open(filepath))
    fname = os.path.basename(filepath)
    file_data[fname] = data
    if "space_library" in data:
        for s in data["space_library"]:
            all_spaces.append((fname, s))
    if "adjacency_edges" in data:
        for e in data["adjacency_edges"]:
            all_edges.append((fname, e))

master = json.load(open("building_program_database_master_v4.json"))

print(f"\nTotal files: {len(files)}")
print(f"Total spaces: {len(all_spaces)}")
print(f"Total edges: {len(all_edges)}")

# ── Original 9 checks from patch ──

SIMPLIFIED_FILES = {"program_database_cruise_terminal_cruise_day_v4.json",
                    "program_database_cruise_terminal_non_cruise_day_v4.json",
                    "program_database_cruiseport_v4.json"}

REQUIRED_TOP_FIELDS = [
    "id", "name", "category", "nsf_range", "occupant_load_factor",
    "ceiling_height_min_ft", "percent_of_gross_range", "occupancy_load",
    "daylight_priority", "acoustic_sensitivity", "plumbing_required",
    "wet_zone", "mep_intensity", "security_zone", "operations_hours",
    "stacking_preference", "typical_location", "code_tags", "notes",
    "adjacencies", "min_width_ft", "min_depth_ft", "max_aspect_ratio",
    "ibc_occupancy_group", "repeatable", "count_rule", "regularly_occupied",
    "acoustic_class", "door_count", "door_clear_width_in",
    "accessibility_type", "fire_separation_hr", "dimensions_ft",
    "scaling", "performance", "wellness", "bim", "parti"
]
SIMPLIFIED_REQUIRED = ["id", "name", "category", "dimensions_ft", "scaling", "performance", "wellness", "bim", "parti"]

print("\n--- CHECK 1: Space Completeness ---")
missing_fields = []
for fname, s in all_spaces:
    req = SIMPLIFIED_REQUIRED if fname in SIMPLIFIED_FILES else REQUIRED_TOP_FIELDS
    for field in req:
        if field not in s:
            missing_fields.append(f"{fname}/{s.get('id','?')}: missing '{field}'")
check("1. Space completeness (all required fields)", len(missing_fields) == 0, "\n".join(missing_fields[:10]))

print("\n--- CHECK 2: Scaling Data ---")
scaling_issues = []
for fname, s in all_spaces:
    sc = s.get("scaling", {})
    cls = sc.get("class")
    dr = sc.get("driver_relationship")
    if cls == "primary" and dr == "linear" and sc.get("area_per_driver_sf") is None:
        scaling_issues.append(f"{s['id']}: primary/linear missing area_per_driver_sf")
    if cls == "primary" and dr == "step" and sc.get("step_thresholds") is None:
        scaling_issues.append(f"{s['id']}: primary/step missing step_thresholds")
    if cls == "support" and dr == "sqrt" and sc.get("coefficient") is None:
        scaling_issues.append(f"{s['id']}: support/sqrt missing coefficient")
check("2. Scaling coefficients populated", len(scaling_issues) == 0, "\n".join(scaling_issues[:10]))

print("\n--- CHECK 3: Wellness Coverage ---")
total = len(all_spaces)
all_false_count = sum(1 for _, s in all_spaces if all(
    v is None or v is False or v == "none" or v == "None" or v == "" for v in s.get("wellness", {}).values()))
pct = all_false_count * 100 // total if total > 0 else 100
check("3. Wellness coverage (<30% all-false)", pct < 30, f"{all_false_count}/{total} = {pct}%")

print("\n--- CHECK 4: OmniClass Coverage ---")
null_omni = sum(1 for _, s in all_spaces if s.get("bim", {}).get("omniclass_number") is None)
coverage = (total - null_omni) * 100 // total if total > 0 else 0
check("4. OmniClass coverage (>95%)", coverage >= 95, f"{total - null_omni}/{total} = {coverage}%")

print("\n--- CHECK 5: Edge Consistency ---")
edge_issues = []
for fname, data in file_data.items():
    if "space_library" not in data or "adjacency_edges" not in data: continue
    space_ids = {s["id"] for s in data["space_library"]}
    for edge in data["adjacency_edges"]:
        if edge["from"] not in space_ids: edge_issues.append(f"{fname}: unknown '{edge['from']}'")
        if edge["to"] not in space_ids: edge_issues.append(f"{fname}: unknown '{edge['to']}'")
check("5. Edge consistency", len(edge_issues) == 0, "\n".join(edge_issues[:10]))

print("\n--- CHECK 6: PARTI Config Consistency ---")
parti_issues = []
for fname, data in file_data.items():
    if "space_library" not in data or "parti_config" not in data: continue
    space_ids = {s["id"] for s in data["space_library"]}
    variants = data["parti_config"].get("variants", {})
    if isinstance(variants, dict):
        for vname, variant in variants.items():
            for room in variant.get("room_selection", []):
                sid = room.get("space_id")
                if sid and sid not in space_ids:
                    parti_issues.append(f"{fname}/{vname}: unknown '{sid}'")
check("6. PARTI config consistency", len(parti_issues) == 0, "\n".join(parti_issues[:10]))

print("\n--- CHECK 7: Cross-File Integrity ---")
db_files = {db.get("file") for db in master.get("databases", []) if db.get("file")}
existing_files = {os.path.basename(f) for f in files}
missing_files = db_files - existing_files
check("7a. All master-listed files exist on disk", len(missing_files) == 0, f"Missing: {missing_files}")

count_mismatches = []
for db_entry in master.get("databases", []):
    bt = db_entry.get("building_type", "")
    expected = db_entry.get("space_count", 0)
    fname = db_entry.get("file")
    if fname and fname in file_data:
        actual = len(file_data[fname].get("space_library", []))
        if actual != expected: count_mismatches.append(f"{bt}: master={expected}, actual={actual}")
check("7b. Space counts match master", len(count_mismatches) == 0, "\n".join(count_mismatches[:10]))

print("\n--- CHECK 8: Numeric Ranges ---")
range_issues = []
for fname, s in all_spaces:
    sid = s["id"]
    nsf = s.get("nsf_range", [])
    if len(nsf) == 2 and nsf[0] > nsf[1]:
        range_issues.append(f"{sid}: nsf_range inverted")
    dims = s.get("dimensions_ft", {})
    mn = dims.get("min_area_sf", 0)
    mx = dims.get("max_area_sf", 0)
    if mn and mx and mn > mx:
        range_issues.append(f"{sid}: min_area_sf > max_area_sf")
    ch = s.get("ceiling_height_min_ft")
    if ch is not None and ch <= 0:
        range_issues.append(f"{sid}: ceiling_height_min_ft <= 0")
check("8. Numeric ranges valid", len(range_issues) == 0, "\n".join(range_issues[:10]))

print("\n--- CHECK 9: K12 Specialty Spaces ---")
k12_data = None
for fname, data in file_data.items():
    if "k12" in fname.lower(): k12_data = data; break
k12_required = ["K12_SCIENCE_LAB", "K12_SCIENCE_PREP", "K12_ART", "K12_MUSIC", "K12_TECH_ED", "K12_SPED"]
if k12_data:
    k12_ids = {s["id"] for s in k12_data["space_library"]}
    missing = [sid for sid in k12_required if sid not in k12_ids]
    check("9. K12 specialty spaces present", len(missing) == 0, f"Missing: {missing}")

# ── Post-patch additions ──

CANONICAL_RELS = {"must_adjoin", "should_adjoin", "near", "optional", "separate", "avoid", "secure_separation", "vertical_stack"}

print("\n--- CHECK 10: Relationship Vocabulary ---")
bad_rels = []
for fname, s in all_spaces:
    for adj in s.get("adjacencies", []):
        r = adj.get("relationship", "")
        if r not in CANONICAL_RELS:
            bad_rels.append(f"{s['id']}: '{r}'")
check("10. All adjacency relationships use canonical enum", len(bad_rels) == 0, "\n".join(bad_rels[:10]))

print("\n--- CHECK 11: Plan Archetypes ---")
VALID_ARCHETYPES = {"bar", "double-loaded-slab", "central-core", "racetrack", "donut",
                    "courtyard", "podium-tower", "hall-and-wing", "branching-civic",
                    "shed-and-support", "finger-plan", "campus-cluster"}
arch_issues = []
for fname, data in file_data.items():
    pa = data.get("plan_archetypes", {})
    if not pa:
        arch_issues.append(f"{fname}: missing plan_archetypes")
    elif pa.get("primary") not in VALID_ARCHETYPES:
        arch_issues.append(f"{fname}: invalid primary archetype '{pa.get('primary')}'")
check("11. Plan archetypes present and valid", len(arch_issues) == 0, "\n".join(arch_issues[:10]))

print("\n--- CHECK 12: PARTI Runtime ---")
rt_path = "parti_runtime_v4.json"
if os.path.exists(rt_path):
    rt = json.load(open(rt_path))
    programs = rt.get("programs", {})
    rt_issues = []
    for pname, prog in programs.items():
        for room in prog.get("rooms", []):
            for field in ["space_id", "name", "dept", "zone", "area", "daylight", "minW", "minH", "maxAspect", "scaling_class", "priority_rank"]:
                if field not in room:
                    rt_issues.append(f"{pname}/{room.get('name','?')}: missing '{field}'")
                    break
    check("12a. PARTI runtime rooms have all required fields", len(rt_issues) == 0, "\n".join(rt_issues[:10]))
    check("12b. PARTI runtime has all building types", len(programs) >= 20, f"{len(programs)} programs (need >=20)")

    # Check K12 specialty spaces in runtime
    k12_rt = programs.get("K-12 School", {})
    k12_names = [r["name"] for r in k12_rt.get("rooms", [])]
    k12_spec = ["Science Lab", "Art Room", "Music", "Tech Ed", "SPED Resource"]
    missing_spec = [n for n in k12_spec if n not in k12_names]
    check("12c. K12 runtime has specialty spaces", len(missing_spec) == 0, f"Missing: {missing_spec}")
else:
    check("12. PARTI runtime exists", False, f"{rt_path} not found")

print("\n--- CHECK 13: Docs-App Build ---")
docs_dist = os.path.join("..", "docs-app", "dist", "index.html")
check("13. Docs-app build exists", os.path.exists(docs_dist))

print("\n--- CHECK 14: FORM Scaling Engine ---")
scale_path = os.path.join("..", "REFERENCE", "CALVEY_FORM_v3", "server", "engines", "scale.js")
check("14. FORM scaling engine exists", os.path.exists(scale_path))

# ── Summary ──
print("\n" + "=" * 70)
passed = sum(1 for r in results.values() if r["passed"])
failed = sum(1 for r in results.values() if not r["passed"])
print(f"RESULTS: {passed} PASSED, {failed} FAILED out of {len(results)} checks")
if all_pass:
    print("\n  ALL CHECKS PASSED")
else:
    print("\n  FAILURES:")
    for name, r in results.items():
        if not r["passed"]:
            print(f"    - {name}")
            if r["details"]:
                for line in r["details"].split("\n")[:3]:
                    print(f"      {line}")
print("=" * 70)
sys.exit(0 if all_pass else 1)
