import {
  BuildingProgramDefinition,
  FloorPlan,
  PlanRoom,
  Point,
  Rect,
  SiteContext
} from "../../models/types";
import { stableHash } from "../../utils/id";
import { sum } from "../../utils/math";
import { getBoundingBox, polygonArea } from "../geometry/polygon";

export interface RoomAssignment {
  roomTypeId: string;
  floorIndex: number;
}

export interface ZonedFloor {
  id: string;
  label: string;
  index: number;
  elevationFt: number;
  polygon: Point[];
  corridor: Rect;
  lanes: Rect[];
}

export interface ZonedPlan {
  floors: ZonedFloor[];
  assignments: RoomAssignment[];
  placementBounds: Rect;
}

function getRoomSortKey(seed: string, roomTypeId: string): number {
  return stableHash(`${seed}:${roomTypeId}`);
}

export function zoneFootprint(
  site: SiteContext,
  program: BuildingProgramDefinition,
  seed: string
): ZonedPlan {
  const bounds = getBoundingBox(site.footprint);
  const footprintArea = polygonArea(site.footprint);
  const usablePerFloor = footprintArea * 0.78;
  const totalTargetArea = sum(
    program.roomDefinitions.map((roomDefinition) => roomDefinition.targetArea)
  );
  const requiredFloors = Math.max(
    1,
    Math.ceil(totalTargetArea / Math.max(1, usablePerFloor))
  );
  const floorCount = Math.min(program.maxFloors, requiredFloors);
  const corridorWidth = program.corridorType === "single_loaded" ? 8 : 10;
  const horizontalCorridor = bounds.width >= bounds.height;

  const floors: ZonedFloor[] = Array.from({ length: floorCount }, (_, index) => {
    const corridor = horizontalCorridor
      ? {
          x: bounds.x,
          y: bounds.y + bounds.height / 2 - corridorWidth / 2,
          width: bounds.width,
          height: corridorWidth
        }
      : {
          x: bounds.x + bounds.width / 2 - corridorWidth / 2,
          y: bounds.y,
          width: corridorWidth,
          height: bounds.height
        };

    const lanes = horizontalCorridor
      ? [
          {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: corridor.y - bounds.y
          },
          {
            x: bounds.x,
            y: corridor.y + corridor.height,
            width: bounds.width,
            height: bounds.y + bounds.height - (corridor.y + corridor.height)
          }
        ]
      : [
          {
            x: bounds.x,
            y: bounds.y,
            width: corridor.x - bounds.x,
            height: bounds.height
          },
          {
            x: corridor.x + corridor.width,
            y: bounds.y,
            width: bounds.x + bounds.width - (corridor.x + corridor.width),
            height: bounds.height
          }
        ];

    return {
      id: `floor-${index + 1}`,
      label: `Floor ${index + 1}`,
      index,
      elevationFt: index * 14,
      polygon: site.footprint,
      corridor,
      lanes
    };
  });

  const floorLoads = new Array(floorCount).fill(0);

  const assignments = [...program.roomDefinitions]
    .sort((roomA, roomB) => {
      const areaDifference = roomB.targetArea - roomA.targetArea;

      if (areaDifference !== 0) {
        return areaDifference;
      }

      return getRoomSortKey(seed, roomA.id) - getRoomSortKey(seed, roomB.id);
    })
    .map((roomDefinition) => {
      let candidateFloors: number[];

      if (roomDefinition.floorPreference === "ground") {
        candidateFloors = [0];
      } else if (roomDefinition.floorPreference === "upper") {
        candidateFloors = floorCount > 1 ? floors.slice(1).map((floor) => floor.index) : [0];
      } else {
        candidateFloors = floors.map((floor) => floor.index);
      }

      const floorIndex = candidateFloors.reduce((bestFloor, currentFloor) =>
        floorLoads[currentFloor] < floorLoads[bestFloor] ? currentFloor : bestFloor
      );

      floorLoads[floorIndex] += roomDefinition.targetArea;

      return {
        roomTypeId: roomDefinition.id,
        floorIndex
      };
    });

  return {
    floors,
    assignments,
    placementBounds: bounds
  };
}

export function createEmptyRoom(): Pick<PlanRoom, "score" | "confidence"> {
  return {
    score: {
      total: 0,
      areaFit: 0,
      adjacency: 0,
      daylight: 0,
      circulation: 0,
      structure: 0,
      compactness: 0,
      notes: []
    },
    confidence: {
      value: 0,
      label: "low",
      reasons: []
    }
  };
}

export function createEmptyFloor(
  zonedFloor: ZonedFloor,
  rooms: PlanRoom[]
): FloorPlan {
  return {
    id: zonedFloor.id,
    label: zonedFloor.label,
    index: zonedFloor.index,
    elevationFt: zonedFloor.elevationFt,
    polygon: zonedFloor.polygon,
    corridor: zonedFloor.corridor,
    rooms
  };
}
