import {
  PartyProject,
  Point,
  ScoringWeights,
  SiteContext
} from "./types";

const defaultFootprint: Point[] = [
  { x: 0, y: 0 },
  { x: 96, y: 0 },
  { x: 96, y: 64 },
  { x: 0, y: 64 }
];

export const defaultWeights: ScoringWeights = {
  adjacency: 30,
  daylight: 20,
  circulation: 20,
  structure: 15,
  compactness: 15
};

export const defaultSiteContext: SiteContext = {
  footprint: defaultFootprint,
  trueNorthDeg: 12,
  latitude: 40.7128,
  longitude: -74.006,
  context: [
    {
      id: "context-west",
      name: "West warehouse",
      type: "building",
      polygon: [
        { x: -28, y: 8 },
        { x: -8, y: 8 },
        { x: -8, y: 54 },
        { x: -28, y: 54 }
      ]
    },
    {
      id: "context-south",
      name: "Traffic edge",
      type: "noise",
      polygon: [
        { x: 8, y: 70 },
        { x: 84, y: 70 },
        { x: 84, y: 82 },
        { x: 8, y: 82 }
      ]
    }
  ],
  anchors: [
    {
      id: "anchor-core",
      name: "Main core",
      type: "core",
      x: 42,
      y: 24,
      width: 12,
      height: 16
    },
    {
      id: "anchor-structure-line",
      name: "Structure line",
      type: "structure_line",
      x: 24,
      y: 0,
      x2: 24,
      y2: 64
    }
  ]
};

export function createDefaultProject(): PartyProject {
  const now = new Date().toISOString();

  return {
    id: "party-project-default",
    name: "CALVEY PARTY 2 Studio",
    version: 1,
    createdAt: now,
    updatedAt: now,
    site: defaultSiteContext,
    programSelection: {
      buildingTypeId: "maker_mixed_use_infill"
    },
    weights: defaultWeights,
    seed: "party-2-seed",
    notes:
      "Engine baseline focused on a single best-guess plan. Commit geometry edits here to create clean learning signals.",
    engineProposal: null,
    committedPlan: null,
    session: {
      events: [],
      signals: []
    }
  };
}
