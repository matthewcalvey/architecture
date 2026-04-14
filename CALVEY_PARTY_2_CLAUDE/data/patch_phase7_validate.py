#!/usr/bin/env python3
"""Phase 7: Comprehensive validation of v4 database."""
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

print("=" * 60)
print("CALVEY PROGRAM DATABASE v4 — VALIDATION REPORT")
print("=" * 60)

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

# ── Check 1: Space completeness (required fields) ──

print("\n--- CHECK 1: Space Completeness ---")

# Full schema fields (standard building types)
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

# Cruise terminal day files use a simplified schema
SIMPLIFIED_REQUIRED = ["id", "name", "category", "dimensions_ft", "scaling", "performance", "wellness", "bim", "parti"]

# Files with simplified schema
SIMPLIFIED_FILES = {"program_database_cruise_terminal_cruise_day_v4.json",
                    "program_database_cruise_terminal_non_cruise_day_v4.json",
                    "program_database_cruiseport_v4.json"}

missing_fields = []
for fname, s in all_spaces:
    req = SIMPLIFIED_REQUIRED if fname in SIMPLIFIED_FILES else REQUIRED_TOP_FIELDS
    for field in req:
        if field not in s:
            missing_fields.append(f"{fname}/{s.get('id','?')}: missing '{field}'")

check("1a. All spaces have required top-level fields",
      len(missing_fields) == 0,
      "\n".join(missing_fields[:20]) + (f"\n... and {len(missing_fields)-20} more" if len(missing_fields) > 20 else ""))

# Check dimensions_ft sub-fields
DIM_FIELDS = ["typical_width", "typical_depth", "typical_area_sf", "min_width", "min_depth", "min_area_sf", "max_area_sf"]
missing_dims = []
for fname, s in all_spaces:
    dims = s.get("dimensions_ft", {})
    for field in DIM_FIELDS:
        if field not in dims or dims[field] is None:
            missing_dims.append(f"{fname}/{s['id']}: dimensions_ft.{field}")
            break  # one per space

check("1b. All spaces have dimensions_ft sub-fields",
      len(missing_dims) == 0,
      "\n".join(missing_dims[:10]))

# ── Check 2: Scaling data ──

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

check("2. Scaling coefficients populated",
      len(scaling_issues) == 0,
      "\n".join(scaling_issues[:10]))

# ── Check 3: Wellness coverage ──

print("\n--- CHECK 3: Wellness Coverage ---")

total_spaces = len(all_spaces)
all_false_count = 0
for fname, s in all_spaces:
    w = s.get("wellness", {})
    if all(v is None or v is False or v == "none" or v == "None" or v == "" for v in w.values()):
        all_false_count += 1

pct = all_false_count * 100 // total_spaces if total_spaces > 0 else 100
check("3. Wellness coverage (target <30% all-false)",
      pct < 30,
      f"{all_false_count}/{total_spaces} = {pct}% all-false")

# ── Check 4: OmniClass coverage ──

print("\n--- CHECK 4: OmniClass Coverage ---")

null_omni = sum(1 for _, s in all_spaces if s.get("bim", {}).get("omniclass_number") is None)
coverage = (total_spaces - null_omni) * 100 // total_spaces if total_spaces > 0 else 0
check("4. OmniClass coverage (target >95%)",
      coverage >= 95,
      f"{total_spaces - null_omni}/{total_spaces} = {coverage}%")

# ── Check 5: Edge consistency ──

print("\n--- CHECK 5: Edge Consistency ---")

edge_issues = []
for fname, data in file_data.items():
    if "space_library" not in data or "adjacency_edges" not in data:
        continue
    space_ids = {s["id"] for s in data["space_library"]}
    for edge in data["adjacency_edges"]:
        if edge["from"] not in space_ids:
            edge_issues.append(f"{fname}: edge references unknown space '{edge['from']}'")
        if edge["to"] not in space_ids:
            edge_issues.append(f"{fname}: edge references unknown space '{edge['to']}'")

check("5. Edge consistency (all referenced space_ids exist)",
      len(edge_issues) == 0,
      "\n".join(edge_issues[:10]))

# ── Check 6: PARTI config consistency ──

print("\n--- CHECK 6: PARTI Config Consistency ---")

parti_issues = []
for fname, data in file_data.items():
    if "space_library" not in data or "parti_config" not in data:
        continue
    space_ids = {s["id"] for s in data["space_library"]}
    pc = data["parti_config"]
    variants = pc.get("variants", {})
    if isinstance(variants, dict):
        for vname, variant in variants.items():
            for room in variant.get("room_selection", []):
                sid = room.get("space_id")
                if sid and sid not in space_ids:
                    parti_issues.append(f"{fname}/{vname}: PARTI references unknown '{sid}'")

check("6. PARTI config consistency",
      len(parti_issues) == 0,
      "\n".join(parti_issues[:10]))

# ── Check 7: Cross-file integrity ──

print("\n--- CHECK 7: Cross-File Integrity ---")

db_files = set()
for db_entry in master.get("databases", []):
    f = db_entry.get("file")
    if f:
        db_files.add(f)

existing_files = {os.path.basename(f) for f in files}
missing_files = db_files - existing_files
extra_files = existing_files - db_files

check("7a. All master-listed files exist on disk",
      len(missing_files) == 0,
      f"Missing: {missing_files}" if missing_files else "")

# Check space counts match
count_mismatches = []
for db_entry in master.get("databases", []):
    bt = db_entry.get("building_type", "")
    expected_count = db_entry.get("space_count", 0)
    fname = db_entry.get("file")
    if fname and fname in file_data:
        actual_count = len(file_data[fname].get("space_library", []))
        if actual_count != expected_count:
            count_mismatches.append(f"{bt}: master says {expected_count}, file has {actual_count}")

check("7b. Space counts match master registry",
      len(count_mismatches) == 0,
      "\n".join(count_mismatches[:10]))

# ── Check 8: Numeric ranges ──

print("\n--- CHECK 8: Numeric Ranges ---")

range_issues = []
for fname, s in all_spaces:
    sid = s["id"]
    nsf = s.get("nsf_range", [])
    if len(nsf) == 2 and nsf[0] > nsf[1]:
        range_issues.append(f"{sid}: nsf_range[0]={nsf[0]} > nsf_range[1]={nsf[1]}")

    dims = s.get("dimensions_ft", {})
    min_a = dims.get("min_area_sf", 0)
    max_a = dims.get("max_area_sf", 0)
    if min_a and max_a and min_a > max_a:
        range_issues.append(f"{sid}: min_area_sf={min_a} > max_area_sf={max_a}")

    pogr = s.get("percent_of_gross_range", [])
    if len(pogr) == 2 and pogr[0] > pogr[1]:
        range_issues.append(f"{sid}: percent_of_gross_range[0] > [1]")

    # Check positive values (skip if field is None or missing — simplified schema)
    ch = s.get("ceiling_height_min_ft")
    if ch is not None and ch <= 0:
        range_issues.append(f"{sid}: ceiling_height_min_ft <= 0")
    mw = s.get("min_width_ft")
    if mw is not None and mw <= 0:
        range_issues.append(f"{sid}: min_width_ft <= 0")
    md = s.get("min_depth_ft")
    if md is not None and md <= 0:
        range_issues.append(f"{sid}: min_depth_ft <= 0")

check("8. Numeric ranges valid",
      len(range_issues) == 0,
      "\n".join(range_issues[:10]) + (f"\n... and {len(range_issues)-10} more" if len(range_issues) > 10 else ""))

# ── Check 9: K12 specialty spaces present ──

print("\n--- CHECK 9: K12 Specialty Spaces ---")

k12_data = None
for fname, data in file_data.items():
    if "k12" in fname.lower():
        k12_data = data
        break

k12_required = ["K12_SCIENCE_LAB", "K12_SCIENCE_PREP", "K12_ART", "K12_MUSIC", "K12_TECH_ED", "K12_SPED"]
if k12_data:
    k12_ids = {s["id"] for s in k12_data["space_library"]}
    missing_k12 = [sid for sid in k12_required if sid not in k12_ids]
    check("9. K12 specialty spaces present",
          len(missing_k12) == 0,
          f"Missing: {missing_k12}" if missing_k12 else "")
else:
    check("9. K12 specialty spaces present", False, "K12 file not found")

# ── Summary ──

print("\n" + "=" * 60)
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

print("=" * 60)
sys.exit(0 if all_pass else 1)
