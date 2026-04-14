/**
 * Canonical color palettes for CALVEY — shared across Program docs and PARTI.
 *
 * Category colors (fine-grained, per-space-category) are the single source of
 * truth.  Department colors (coarser, per-department-group) are derived from
 * the same family so the two levels always feel unified.
 *
 * The PARTI page reads department_palette colors from parti_runtime.json,
 * which are set by generate_parti_configs.js using DEPARTMENT_COLORS below.
 */

// ── Category colors ────────────────────────────────────────────────────────
// Matches the CAT_COLORS palette in data/scripts/add_categories_to_parti.js.
export const CATEGORY_COLORS = {
  // Public / Entry
  'Public/Entry': '#d4a843', 'Public/Commons': '#c9a959', 'Public/Support': '#b89a50',
  'Public/Primary': '#dbb24e', 'Public/Comfort': '#c4944a', 'Public/Program': '#d0a040',
  'Public/Service': '#b8923e', 'Public/Security': '#a88740',

  // Administration
  'Administration': '#9b7ec8', 'Administration/Academic': '#8a6fb8',
  'Admin': '#9b7ec8', 'Admin/Support': '#9b7ec8',

  // Work / Meeting
  'Work': '#5eb8d8', 'Workspace': '#5eb8d8',
  'Meeting': '#4ea8cc', 'Conference': '#4ea8cc',

  // Learning / Education
  'Learning': '#5dba72', 'Learning Commons': '#4aad62', 'Instruction': '#68c47e',
  'Education': '#52b268', 'Training': '#60be78',
  'Classroom': '#5dba72',

  // Clinical / Patient Care
  'Clinical': '#d05a42', 'Clinical/Support': '#c04e38', 'Clinical/Diagnostics': '#b84830',
  'Patient Care': '#d05a42',

  // Laboratory
  'Laboratory': '#3db8a0', 'Laboratory/Support': '#35a890',

  // Food / Revenue
  'Food Service': '#d4963a', 'Revenue': '#cc8a30', 'Revenue/Food': '#d49a40', 'Revenue/Retail': '#c08030',

  // Amenity
  'Amenity': '#5a9ec8', 'Amenity/Outdoor': '#4a94ba', 'Amenity/Operations': '#5090b4', 'Amenity/Social': '#4c8cb8',

  // Residential / Guest
  'Residential': '#c87a8a', 'Residential/Component': '#b86e7e', 'Rooms': '#d08494',
  'Residential/Suite': '#d48898', 'Residential/Apartment': '#ba7282', 'Residential/Room': '#c0768a',
  'Residential/Memory Care': '#ae6a78', 'Residential/Support': '#a86474',
  'Guest Rooms': '#c87a8a', 'Guest': '#c87a8a', 'Living Quarters': '#b87080',

  // Athletics / Recreation
  'Athletics': '#e08850', 'Active/Primary': '#d87c44', 'Active/Community': '#cc7040', 'Active/Aquatic': '#c46838',
  'Recreation': '#e08850',

  // Assembly / Performance
  'Assembly': '#6a6eb8', 'Event': '#6268b4',
  'Performance': '#5c60b0', 'Performance/BOH': '#4e52a0', 'Performance/Technical': '#5458a8',

  // Worship
  'Worship/Primary': '#9070b8', 'Worship/Support': '#8060a8', 'Worship/Technical': '#7858a0',

  // Exhibition / Community
  'Exhibition': '#b8946a', 'Community': '#a8886a', 'Community/Support': '#988060',
  'Gallery': '#b8946a',

  // Circulation / Core
  'Circulation': '#607080', 'Circulation/Core': '#506070', 'Circulation/BOH': '#586878',
  'Circulation/Pedestrian': '#687888', 'Circulation/Vehicle': '#586470',

  // Operations
  'Operations': '#6a7a88', 'Operations/Circulation': '#607080', 'Operations/BOH': '#5a6a78',
  'Operations/Logistics': '#506070', 'Operations/Support': '#586878',
  'Operations/Office': '#647888', 'Operations/Primary': '#5e7080',
  'Operations/Resident': '#687a8a', 'Operations/Special': '#5a6c7c',
  'Operations/Telecom': '#4e6270', 'Operations/Multimodal': '#607282', 'Operations/Aquatic': '#507080',

  // Support
  'Support': '#708878', 'Support/Amenity': '#608070', 'Support/BOH': '#587868',
  'Support/Family': '#689078', 'Support/Multimodal': '#607868', 'Support/Wet': '#588070',

  // MEP / Infrastructure
  'MEP': '#485868', 'MEP/Tech': '#405060', 'MEP/Power': '#384858', 'MEP/Cooling': '#3e5060', 'MEP/Aquatic': '#364850',
  'Mechanical': '#485868',

  // Safety / Specialized
  'Safety/Operations': '#8a4848',

  // Mobility / Parking / Storage
  'Mobility': '#708898', 'Parking': '#4a5a68',
  'Storage': '#5a6058', 'Loading': '#505850',

  // Retail
  'Retail': '#c08030',

  // Cruise Terminal — Cruise Day (categories A–G)
  'Passenger Processing – Embarkation': '#d4a843',
  'Passenger Processing – Debarkation': '#5eb8d8',
  'Baggage & Logistics': '#b8946a',
  'Vertical Circulation': '#607080',
  'Operations & Back-of-House': '#6a7a88',
  'Building Systems & MEP': '#485868',
  'Public Amenities': '#5a9ec8',

  // Cruise Terminal — Non-Cruise Day
  'Event & Conference Venue (Upper Level)': '#6a6eb8',
  'Community Recreation & Culture (Ground Level)': '#5dba72',
  'Event Support & Logistics': '#708878',
  'Event Operations & Back-of-House': '#9b7ec8',
}

// ── Department colors ──────────────────────────────────────────────────────
// Coarser palette keyed by department_group names used in parti_config.
// Derived from the category families above so both levels feel unified.
export const DEPARTMENT_COLORS = {
  'Support':     '#708878',
  'Meeting':     '#4ea8cc',
  'Workspace':   '#5eb8d8',
  'Core':        '#607080',
  'Admin':       '#9b7ec8',
  'Commons':     '#c9a959',
  'Classrooms':  '#5dba72',
  'Academic':    '#5dba72',
  'Clinical':    '#d05a42',
  'Public':      '#d4a843',
  'Guest':       '#c87a8a',
  'BOH':         '#5a6a78',
  'Amenity':     '#5a9ec8',
  'Units':       '#c87a8a',
  'Residential': '#c87a8a',
  'Lab':         '#3db8a0',
  'Office':      '#9b7ec8',
  'Sales':       '#cc8a30',
  'Production':  '#6a7a88',
  'Gallery':     '#b8946a',
  'Exhibition':  '#b8946a',
  'Worship':     '#9070b8',
  'Community':   '#a8886a',
  'Activity':    '#e08850',
  'Data Hall':   '#485868',
  'Parking':     '#4a5a68',
  'Transit':     '#607282',
  'Apparatus':   '#8a4848',
  'Living':      '#c87a8a',
  'Processing':  '#6a7a88',
  'Assembly':    '#6a6eb8',
  'Common':      '#c9a959',
}

// ── Scaling-class colors ───────────────────────────────────────────────────
// Used by ScalingSimulator and BuildingTypeDetail ScalingTab.
export const CLASS_COLORS = {
  primary:        '#5eb8d8',
  support:        '#708878',
  fixed:          '#d4a843',
  infrastructure: '#607080',
}

// ── Architectural fallback palette ─────────────────────────────────────────
// When departments need de-duplicated colors, draw from this ordered list.
// Matches ARCH_COLORS in CALVEY_PARTI.html.
export const ARCH_COLORS = [
  '#d4a843', '#5eb8d8', '#5dba72', '#607080', '#9b7ec8',
  '#d05a42', '#3db8a0', '#b8946a', '#c87a8a', '#5a9ec8',
  '#6a6eb8', '#e08850', '#708878', '#cc8a30',
]

// ── Helpers ────────────────────────────────────────────────────────────────

/** Resolve a space category string to a color (fuzzy substring match). */
export function getCategoryColor(category) {
  if (!category) return '#888888'
  // Exact match first
  if (CATEGORY_COLORS[category]) return CATEGORY_COLORS[category]
  // Substring match (case-insensitive)
  const lc = category.toLowerCase()
  for (const [key, color] of Object.entries(CATEGORY_COLORS)) {
    if (lc.includes(key.toLowerCase())) return color
  }
  return '#888888'
}

/** Resolve a department group name to a color. */
export function getDepartmentColor(dept) {
  return DEPARTMENT_COLORS[dept] || '#607080'
}
