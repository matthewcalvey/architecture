import {
  AdjacencyEdge,
  Anchor,
  BuildingProgramDefinition,
  FloorPlan,
  PlanModel,
  PlanRoom,
  PlanScoreSummary,
  PlanWarning,
  RoomScoreBreakdown,
  ScoringWeights,
  SiteContext
} from "../../models/types";
import { average, clamp, round } from "../../utils/math";
import {
  getBoundingBox,
  rectArea,
  rectAspectRatio,
  rectCenter,
  rectGap,
  rectOverlapRatio
} from "../geometry/polygon";

function findRoomDefinition(
  program: BuildingProgramDefinition,
  roomTypeId: string
) {
  return program.roomDefinitions.find((roomDefinition) => roomDefinition.id === roomTypeId);
}

function normalizeWeights(weights: ScoringWeights): ScoringWeights {
  const total =
    weights.adjacency +
    weights.daylight +
    weights.circulation +
    weights.structure +
    weights.compactness;

  return {
    adjacency: weights.adjacency / total,
    daylight: weights.daylight / total,
    circulation: weights.circulation / total,
    structure: weights.structure / total,
    compactness: weights.compactness / total
  };
}

function evaluateAdjacency(
  room: PlanRoom,
  allRooms: PlanRoom[],
  edges: AdjacencyEdge[]
): { score: number; notes: string[] } {
  const relevantEdges = edges.filter(
    (edge) => edge.from === room.roomTypeId || edge.to === room.roomTypeId
  );

  if (!relevantEdges.length) {
    return {
      score: 0.82,
      notes: ["No critical adjacency obligations for this room."]
    };
  }

  const roomLookup = new Map(allRooms.map((candidateRoom) => [candidateRoom.roomTypeId, candidateRoom]));
  const values = relevantEdges.map((edge) => {
    const counterpart = roomLookup.get(edge.from === room.roomTypeId ? edge.to : edge.from);

    if (!counterpart) {
      return edge.relation === "separated" ? 1 : 0;
    }

    const gap = rectGap(room.geometry, counterpart.geometry);
    const overlapRatio = rectOverlapRatio(room.geometry, counterpart.geometry);
    const isSameFloor = room.floorId === counterpart.floorId;

    switch (edge.relation) {
      case "required":
        return isSameFloor ? clamp(1 - gap / 24, 0, 1) : 0.15;
      case "preferred":
        return isSameFloor ? clamp(1 - gap / 36, 0.1, 1) : 0.45;
      case "separated":
        return gap > 12 || !isSameFloor ? 1 : clamp(gap / 12, 0, 1);
      case "stacked":
        return !isSameFloor ? clamp(overlapRatio, 0, 1) : 0.35;
      default:
        return 0.5;
    }
  });

  const averageValue = average(values);
  const weakestEdge = relevantEdges[values.indexOf(Math.min(...values))];
  const notes =
    averageValue < 0.65 && weakestEdge
      ? [
          `${weakestEdge.relation} adjacency to ${
            weakestEdge.from === room.roomTypeId ? weakestEdge.to : weakestEdge.from
          } is underperforming.`
        ]
      : ["Adjacency behavior is within the intended tolerance band."];

  return {
    score: averageValue,
    notes
  };
}

function evaluateDaylight(room: PlanRoom, site: SiteContext): number {
  const bounds = getBoundingBox(site.footprint);
  const center = rectCenter(room.geometry);
  const northFactor = clamp((bounds.y + bounds.height - center.y) / bounds.height, 0, 1);
  const southFactor = clamp((center.y - bounds.y) / bounds.height, 0, 1);
  const eastFactor = clamp((center.x - bounds.x) / bounds.width, 0, 1);
  const westFactor = clamp((bounds.x + bounds.width - center.x) / bounds.width, 0, 1);

  switch (room.preferredOrientation) {
    case "north":
      return northFactor;
    case "south":
      return southFactor;
    case "east":
      return eastFactor;
    case "west":
      return westFactor;
    default:
      return 0.8;
  }
}

function evaluateCirculation(room: PlanRoom, floor: FloorPlan): number {
  const roomCenter = rectCenter(room.geometry);
  const corridorCenter = rectCenter(floor.corridor);
  const corridorIsHorizontal = floor.corridor.width >= floor.corridor.height;
  const delta = corridorIsHorizontal
    ? Math.abs(roomCenter.y - corridorCenter.y)
    : Math.abs(roomCenter.x - corridorCenter.x);
  const maxDistance = corridorIsHorizontal ? floor.corridor.y - floor.polygon[0].y : floor.corridor.x - floor.polygon[0].x;

  return clamp(1 - delta / Math.max(1, maxDistance), 0, 1);
}

function distanceToAnchor(room: PlanRoom, anchor: Anchor): number {
  const center = rectCenter(room.geometry);
  const anchorCenter = {
    x: anchor.x + (anchor.width ?? 0) / 2,
    y: anchor.y + (anchor.height ?? 0) / 2
  };

  const dx = center.x - anchorCenter.x;
  const dy = center.y - anchorCenter.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function evaluateStructure(room: PlanRoom, anchors: Anchor[]): number {
  if (!anchors.length) {
    return 0.75;
  }

  const coreAnchor = anchors.find((anchor) => anchor.type === "core");
  const structureLine = anchors.find((anchor) => anchor.type === "structure_line");

  if (room.department === "Support" && coreAnchor) {
    return clamp(1 - distanceToAnchor(room, coreAnchor) / 40, 0, 1);
  }

  if (structureLine?.x2 !== undefined && structureLine.y2 !== undefined) {
    const xDistance = Math.abs(rectCenter(room.geometry).x - structureLine.x);
    return clamp(xDistance / 20, 0.2, 1);
  }

  return 0.72;
}

function evaluateCompactness(room: PlanRoom, program: BuildingProgramDefinition): number {
  const roomDefinition = findRoomDefinition(program, room.roomTypeId);

  if (!roomDefinition) {
    return 0.7;
  }

  const [minAspectRatio, maxAspectRatio] = roomDefinition.aspectRatioRange;
  const currentAspectRatio = rectAspectRatio(room.geometry);

  if (currentAspectRatio >= minAspectRatio && currentAspectRatio <= maxAspectRatio) {
    return 1;
  }

  const distanceToBand =
    currentAspectRatio < minAspectRatio
      ? minAspectRatio - currentAspectRatio
      : currentAspectRatio - maxAspectRatio;

  return clamp(1 - distanceToBand / maxAspectRatio, 0, 1);
}

function buildRoomScore(
  room: PlanRoom,
  floor: FloorPlan,
  allRooms: PlanRoom[],
  program: BuildingProgramDefinition,
  site: SiteContext,
  weights: ScoringWeights
): RoomScoreBreakdown {
  const normalizedWeights = normalizeWeights(weights);
  const adjacencyResult = evaluateAdjacency(room, allRooms, program.adjacency);
  const areaFit = clamp(
    1 - Math.abs(room.actualArea - room.targetArea) / Math.max(1, room.targetArea),
    0,
    1
  );
  const daylight = evaluateDaylight(room, site);
  const circulation = evaluateCirculation(room, floor);
  const structure = evaluateStructure(room, site.anchors);
  const compactness = evaluateCompactness(room, program);
  const total =
    adjacencyResult.score * normalizedWeights.adjacency +
    daylight * normalizedWeights.daylight +
    circulation * normalizedWeights.circulation +
    structure * normalizedWeights.structure +
    compactness * normalizedWeights.compactness;

  return {
    total: round(total, 3),
    areaFit: round(areaFit, 3),
    adjacency: round(adjacencyResult.score, 3),
    daylight: round(daylight, 3),
    circulation: round(circulation, 3),
    structure: round(structure, 3),
    compactness: round(compactness, 3),
    notes: adjacencyResult.notes
  };
}

function buildWarnings(
  plan: PlanModel,
  floors: FloorPlan[],
  program: BuildingProgramDefinition
): PlanWarning[] {
  const warnings: PlanWarning[] = [];
  const lowFitRooms = floors.flatMap((floor) =>
    floor.rooms.filter((room) => room.score.areaFit < 0.65)
  );
  const lowConfidenceRooms = floors.flatMap((floor) =>
    floor.rooms.filter((room) => room.confidence.value < 0.45)
  );
  const lowAdjacencyRooms = floors.flatMap((floor) =>
    floor.rooms.filter((room) => room.score.adjacency < 0.55)
  );

  if (lowFitRooms.length) {
    warnings.push({
      id: "warning-area-fit",
      code: "AREA_FIT",
      severity: "warning",
      message: `${lowFitRooms.length} room(s) are materially off target area.`
    });
  }

  if (lowAdjacencyRooms.length) {
    warnings.push({
      id: "warning-adjacency",
      code: "ADJACENCY",
      severity: "warning",
      message: `${lowAdjacencyRooms.length} room(s) still need adjacency repair.`
    });
  }

  if (lowConfidenceRooms.length) {
    warnings.push({
      id: "warning-confidence",
      code: "CONFIDENCE",
      severity: "info",
      message: `${lowConfidenceRooms.length} room(s) should be reviewed before commit.`
    });
  }

  if (plan.floors.length === program.maxFloors) {
    const actualArea = floors
      .flatMap((floor) => floor.rooms)
      .reduce((total, room) => total + rectArea(room.geometry), 0);
    const targetArea = program.roomDefinitions.reduce(
      (total, room) => total + room.targetArea,
      0
    );

    if (actualArea < targetArea * 0.92) {
      warnings.push({
        id: "warning-floor-cap",
        code: "FLOOR_CAP",
        severity: "warning",
        message:
          "Program pressure is close to the maximum floor allowance. Overflow is still editable."
      });
    }
  }

  return warnings;
}

export function scorePlan(
  plan: PlanModel,
  program: BuildingProgramDefinition,
  site: SiteContext,
  weights: ScoringWeights
): PlanModel {
  const allRooms = plan.floors.flatMap((floor) => floor.rooms);

  const scoredFloors = plan.floors.map((floor) => ({
    ...floor,
    rooms: floor.rooms.map((room) => {
      const score = buildRoomScore(room, floor, allRooms, program, site, weights);

      return {
        ...room,
        score
      };
    })
  }));

  const summary = buildPlanScoreSummary(scoredFloors);

  return {
    ...plan,
    floors: scoredFloors,
    score: summary
  };
}

export function buildPlanScoreSummary(floors: FloorPlan[]): PlanScoreSummary {
  const rooms = floors.flatMap((floor) => floor.rooms);

  return {
    overall: round(average(rooms.map((room) => room.score.total)), 3),
    adjacency: round(average(rooms.map((room) => room.score.adjacency)), 3),
    daylight: round(average(rooms.map((room) => room.score.daylight)), 3),
    circulation: round(average(rooms.map((room) => room.score.circulation)), 3),
    structure: round(average(rooms.map((room) => room.score.structure)), 3),
    compactness: round(average(rooms.map((room) => room.score.compactness)), 3)
  };
}

export function finalizeWarnings(
  plan: PlanModel,
  program: BuildingProgramDefinition
): PlanModel {
  return {
    ...plan,
    warnings: buildWarnings(plan, plan.floors, program)
  };
}
