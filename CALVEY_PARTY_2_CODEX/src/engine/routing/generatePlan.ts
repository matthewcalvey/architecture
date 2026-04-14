import {
  BuildingProgramDefinition,
  FloorPlan,
  PlanModel,
  RoomScheduleItem,
  ScoringWeights,
  SiteContext
} from "../../models/types";
import { slugify } from "../../utils/id";
import { round } from "../../utils/math";
import { repairAdjacency } from "../adjacency/repairAdjacency";
import { estimateConfidence } from "../confidence/estimateConfidence";
import { scorePlan, finalizeWarnings } from "../scoring/scorePlan";
import { placeRooms } from "../placement/placeRooms";
import {
  createEmptyFloor,
  zoneFootprint
} from "../zoning/zoneFootprint";

function buildInputSignature(
  site: SiteContext,
  buildingTypeId: string,
  weights: ScoringWeights,
  seed: string
): string {
  return JSON.stringify({
    footprint: site.footprint,
    trueNorthDeg: site.trueNorthDeg,
    latitude: round(site.latitude, 4),
    longitude: round(site.longitude, 4),
    anchors: site.anchors,
    context: site.context,
    buildingTypeId,
    weights,
    seed
  });
}

function buildRoomSchedule(floors: FloorPlan[]): RoomScheduleItem[] {
  return floors.flatMap((floor) =>
    floor.rooms.map((room) => ({
      roomId: room.id,
      roomName: room.name,
      floorLabel: floor.label,
      department: room.department,
      targetArea: room.targetArea,
      actualArea: room.actualArea
    }))
  );
}

export function generatePlan(
  site: SiteContext,
  program: BuildingProgramDefinition,
  weights: ScoringWeights,
  seed: string
): PlanModel {
  const zonedPlan = zoneFootprint(site, program, seed);
  const placedRooms = placeRooms(
    zonedPlan.floors,
    zonedPlan.assignments,
    program,
    seed
  );
  const baseFloors = zonedPlan.floors.map((zonedFloor) =>
    createEmptyFloor(
      zonedFloor,
      placedRooms
        .filter((room) => room.floorId === zonedFloor.id)
        .map(({ laneIndex: _laneIndex, ...room }) => room)
    )
  );
  const repairedFloors = repairAdjacency(baseFloors, program);
  const basePlan: PlanModel = {
    id: `plan-${slugify(program.id)}-${slugify(seed)}`,
    generatedAt: new Date().toISOString(),
    seed,
    inputSignature: buildInputSignature(site, program.id, weights, seed),
    buildingTypeId: program.id,
    floors: repairedFloors,
    warnings: [],
    score: {
      overall: 0,
      adjacency: 0,
      daylight: 0,
      circulation: 0,
      structure: 0,
      compactness: 0
    },
    roomSchedule: []
  };
  const scoredPlan = scorePlan(basePlan, program, site, weights);
  const confidentPlan = estimateConfidence(scoredPlan, program);
  const warnedPlan = finalizeWarnings(confidentPlan, program);

  return {
    ...warnedPlan,
    roomSchedule: buildRoomSchedule(warnedPlan.floors)
  };
}

export function recomputePlanDiagnostics(
  plan: PlanModel,
  site: SiteContext,
  program: BuildingProgramDefinition,
  weights: ScoringWeights
): PlanModel {
  const rescoredPlan = scorePlan(plan, program, site, weights);
  const confidentPlan = estimateConfidence(rescoredPlan, program);
  const warnedPlan = finalizeWarnings(confidentPlan, program);

  return {
    ...warnedPlan,
    roomSchedule: buildRoomSchedule(warnedPlan.floors)
  };
}
