import { ProgramCatalog } from "../../models/types";

export const localProgramCatalog: ProgramCatalog = {
  definitions: [
    {
      id: "maker_mixed_use_infill",
      name: "Maker Mixed-Use Infill",
      description:
        "Ground-floor public production with upper live-work spaces and a compact shared core.",
      maxFloors: 3,
      corridorType: "double_loaded",
      aliases: ["maker-loft", "maker_mixed", "infill-maker"],
      roomDefinitions: [
        {
          id: "lobby",
          name: "Lobby",
          department: "Public",
          targetArea: 420,
          minWidth: 16,
          minDepth: 14,
          aspectRatioRange: [0.8, 2.2],
          preferredOrientation: "south",
          floorPreference: "ground",
          color: "#DA8F4B"
        },
        {
          id: "cafe",
          name: "Cafe",
          department: "Public",
          targetArea: 640,
          minWidth: 20,
          minDepth: 18,
          aspectRatioRange: [0.9, 2.4],
          preferredOrientation: "south",
          floorPreference: "ground",
          color: "#D77C49"
        },
        {
          id: "gallery",
          name: "Gallery",
          department: "Public",
          targetArea: 760,
          minWidth: 24,
          minDepth: 18,
          aspectRatioRange: [0.9, 2.5],
          preferredOrientation: "west",
          floorPreference: "ground",
          color: "#C65F3B"
        },
        {
          id: "maker_lab",
          name: "Maker Lab",
          department: "Production",
          targetArea: 1120,
          minWidth: 28,
          minDepth: 22,
          aspectRatioRange: [1, 2.8],
          preferredOrientation: "north",
          floorPreference: "ground",
          color: "#A75938"
        },
        {
          id: "loading",
          name: "Loading",
          department: "Support",
          targetArea: 260,
          minWidth: 12,
          minDepth: 12,
          aspectRatioRange: [0.8, 2.2],
          preferredOrientation: "west",
          floorPreference: "ground",
          color: "#876E57"
        },
        {
          id: "service_core",
          name: "Service Core",
          department: "Support",
          targetArea: 240,
          minWidth: 12,
          minDepth: 12,
          aspectRatioRange: [0.8, 1.8],
          preferredOrientation: "neutral",
          floorPreference: "any",
          color: "#707C84"
        },
        {
          id: "cowork",
          name: "Cowork",
          department: "Work",
          targetArea: 720,
          minWidth: 20,
          minDepth: 18,
          aspectRatioRange: [1, 2.5],
          preferredOrientation: "east",
          floorPreference: "upper",
          color: "#5E8A8B"
        },
        {
          id: "studio_a",
          name: "Studio A",
          department: "Live",
          targetArea: 620,
          minWidth: 18,
          minDepth: 16,
          aspectRatioRange: [0.8, 2.3],
          preferredOrientation: "east",
          floorPreference: "upper",
          color: "#5A9779"
        },
        {
          id: "studio_b",
          name: "Studio B",
          department: "Live",
          targetArea: 620,
          minWidth: 18,
          minDepth: 16,
          aspectRatioRange: [0.8, 2.3],
          preferredOrientation: "east",
          floorPreference: "upper",
          color: "#4C8469"
        },
        {
          id: "studio_c",
          name: "Studio C",
          department: "Live",
          targetArea: 680,
          minWidth: 18,
          minDepth: 16,
          aspectRatioRange: [0.8, 2.4],
          preferredOrientation: "west",
          floorPreference: "upper",
          color: "#76A167"
        },
        {
          id: "meeting",
          name: "Meeting Room",
          department: "Work",
          targetArea: 260,
          minWidth: 12,
          minDepth: 12,
          aspectRatioRange: [0.8, 2.2],
          preferredOrientation: "north",
          floorPreference: "any",
          color: "#6E8CB9"
        },
        {
          id: "terrace_lounge",
          name: "Terrace Lounge",
          department: "Public",
          targetArea: 420,
          minWidth: 16,
          minDepth: 14,
          aspectRatioRange: [0.8, 2.2],
          preferredOrientation: "south",
          floorPreference: "upper",
          color: "#C5A457"
        }
      ],
      adjacency: [
        { from: "lobby", to: "gallery", relation: "required" },
        { from: "lobby", to: "cafe", relation: "required" },
        { from: "gallery", to: "maker_lab", relation: "preferred" },
        { from: "maker_lab", to: "loading", relation: "required" },
        { from: "maker_lab", to: "service_core", relation: "required" },
        { from: "cowork", to: "meeting", relation: "required" },
        { from: "cowork", to: "terrace_lounge", relation: "preferred" },
        { from: "studio_a", to: "service_core", relation: "preferred" },
        { from: "studio_b", to: "service_core", relation: "preferred" },
        { from: "studio_c", to: "service_core", relation: "preferred" },
        { from: "studio_a", to: "studio_b", relation: "preferred" },
        { from: "studio_b", to: "studio_c", relation: "preferred" },
        { from: "cafe", to: "loading", relation: "separated" }
      ]
    },
    {
      id: "courtyard_housing_midrise",
      name: "Courtyard Housing Midrise",
      description:
        "Compact perimeter housing with a shared amenity belt, stacked core, and deterministic unit clustering.",
      maxFloors: 4,
      corridorType: "hybrid",
      aliases: ["housing-courtyard", "courtyard-housing"],
      roomDefinitions: [
        {
          id: "entry",
          name: "Entry Hall",
          department: "Public",
          targetArea: 360,
          minWidth: 14,
          minDepth: 12,
          aspectRatioRange: [0.8, 2],
          preferredOrientation: "south",
          floorPreference: "ground",
          color: "#CC8D59"
        },
        {
          id: "mail",
          name: "Mail / Reception",
          department: "Public",
          targetArea: 180,
          minWidth: 10,
          minDepth: 10,
          aspectRatioRange: [0.8, 1.8],
          preferredOrientation: "south",
          floorPreference: "ground",
          color: "#B57645"
        },
        {
          id: "amenity",
          name: "Amenity Lounge",
          department: "Shared",
          targetArea: 540,
          minWidth: 18,
          minDepth: 16,
          aspectRatioRange: [1, 2.4],
          preferredOrientation: "west",
          floorPreference: "ground",
          color: "#7E9B67"
        },
        {
          id: "unit_a",
          name: "Unit A",
          department: "Residential",
          targetArea: 680,
          minWidth: 18,
          minDepth: 16,
          aspectRatioRange: [0.8, 2.1],
          preferredOrientation: "east",
          floorPreference: "upper",
          color: "#4E9077"
        },
        {
          id: "unit_b",
          name: "Unit B",
          department: "Residential",
          targetArea: 720,
          minWidth: 18,
          minDepth: 16,
          aspectRatioRange: [0.8, 2.1],
          preferredOrientation: "east",
          floorPreference: "upper",
          color: "#519C8D"
        },
        {
          id: "unit_c",
          name: "Unit C",
          department: "Residential",
          targetArea: 620,
          minWidth: 16,
          minDepth: 15,
          aspectRatioRange: [0.8, 2.1],
          preferredOrientation: "west",
          floorPreference: "upper",
          color: "#6C88B4"
        },
        {
          id: "unit_d",
          name: "Unit D",
          department: "Residential",
          targetArea: 640,
          minWidth: 16,
          minDepth: 15,
          aspectRatioRange: [0.8, 2.1],
          preferredOrientation: "west",
          floorPreference: "upper",
          color: "#8B7AB1"
        },
        {
          id: "core",
          name: "Core",
          department: "Support",
          targetArea: 220,
          minWidth: 12,
          minDepth: 12,
          aspectRatioRange: [0.8, 1.8],
          preferredOrientation: "neutral",
          floorPreference: "any",
          color: "#66727C"
        },
        {
          id: "laundry",
          name: "Laundry",
          department: "Shared",
          targetArea: 200,
          minWidth: 10,
          minDepth: 10,
          aspectRatioRange: [0.8, 1.8],
          preferredOrientation: "north",
          floorPreference: "any",
          color: "#7A91B0"
        }
      ],
      adjacency: [
        { from: "entry", to: "mail", relation: "required" },
        { from: "entry", to: "amenity", relation: "preferred" },
        { from: "core", to: "laundry", relation: "required" },
        { from: "core", to: "unit_a", relation: "preferred" },
        { from: "core", to: "unit_b", relation: "preferred" },
        { from: "core", to: "unit_c", relation: "preferred" },
        { from: "core", to: "unit_d", relation: "preferred" },
        { from: "unit_a", to: "unit_b", relation: "preferred" },
        { from: "unit_c", to: "unit_d", relation: "preferred" }
      ]
    }
  ],
  aliasMap: {
    "maker-loft": "maker_mixed_use_infill",
    maker_mixed: "maker_mixed_use_infill",
    infillmaker: "maker_mixed_use_infill",
    "housing-courtyard": "courtyard_housing_midrise",
    "courtyard-housing": "courtyard_housing_midrise"
  }
};
