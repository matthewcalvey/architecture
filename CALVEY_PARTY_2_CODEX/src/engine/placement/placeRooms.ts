import {
  BuildingProgramDefinition,
  PlanRoom,
  ProgramRoomDefinition,
  Rect
} from "../../models/types";
import { stableHash } from "../../utils/id";
import { round, sum } from "../../utils/math";
import { rectArea } from "../geometry/polygon";
import {
  RoomAssignment,
  ZonedFloor,
  createEmptyRoom
} from "../zoning/zoneFootprint";

export interface PlacedRoom extends PlanRoom {
  laneIndex: number;
}

function getDepartmentPriority(department: string): number {
  const map: Record<string, number> = {
    Public: 0,
    Production: 1,
    Work: 2,
    Live: 3,
    Residential: 3,
    Shared: 4,
    Support: 5
  };

  return map[department] ?? 6;
}

function createLaneRect(
  lane: Rect,
  cursor: number,
  span: number,
  horizontal: boolean
): Rect {
  return horizontal
    ? {
        x: lane.x + cursor,
        y: lane.y,
        width: span,
        height: lane.height
      }
    : {
        x: lane.x,
        y: lane.y + cursor,
        width: lane.width,
        height: span
      };
}

function roomOrderValue(seed: string, room: ProgramRoomDefinition): number {
  return stableHash(`${seed}:${room.id}:${room.department}`);
}

export function placeRooms(
  floors: ZonedFloor[],
  assignments: RoomAssignment[],
  program: BuildingProgramDefinition,
  seed: string
): PlacedRoom[] {
  const roomLookup = new Map(
    program.roomDefinitions.map((roomDefinition) => [roomDefinition.id, roomDefinition])
  );
  const corridorIsHorizontal = floors[0].corridor.width >= floors[0].corridor.height;

  return assignments.flatMap((assignment) => {
    const floor = floors[assignment.floorIndex];
    const room = roomLookup.get(assignment.roomTypeId);

    if (!floor || !room) {
      return [];
    }

    return {
      assignment,
      floor,
      room
    };
  })
    .sort((entryA, entryB) => {
      if (entryA.floor.index !== entryB.floor.index) {
        return entryA.floor.index - entryB.floor.index;
      }

      const departmentDelta =
        getDepartmentPriority(entryA.room.department) -
        getDepartmentPriority(entryB.room.department);

      if (departmentDelta !== 0) {
        return departmentDelta;
      }

      const targetAreaDelta = entryB.room.targetArea - entryA.room.targetArea;

      if (targetAreaDelta !== 0) {
        return targetAreaDelta;
      }

      return roomOrderValue(seed, entryA.room) - roomOrderValue(seed, entryB.room);
    })
    .reduce<PlacedRoom[]>((placedRooms, entry) => {
      const floorRooms = placedRooms.filter((room) => room.floorId === entry.floor.id);
      const laneTargets = entry.floor.lanes.map((lane, laneIndex) => {
        const laneLoad = sum(
          floorRooms
            .filter((room) => room.laneIndex === laneIndex)
            .map((room) => room.targetArea)
        );

        return {
          lane,
          laneIndex,
          load: laneLoad
        };
      });
      const chosenLane = laneTargets.reduce((best, current) =>
        current.load < best.load ? current : best
      );
      const laneRooms = floorRooms.filter((room) => room.laneIndex === chosenLane.laneIndex);
      const lane = chosenLane.lane;
      const laneCapacity = corridorIsHorizontal ? lane.height : lane.width;
      const targetSpan = entry.room.targetArea / Math.max(1, laneCapacity);
      const minSpan = corridorIsHorizontal ? entry.room.minWidth : entry.room.minDepth;
      const span = Math.max(minSpan, targetSpan);
      const cursor = laneRooms.reduce(
        (currentCursor, room) =>
          currentCursor +
          (corridorIsHorizontal ? room.geometry.width : room.geometry.height),
        0
      );
      const availableSpan = corridorIsHorizontal
        ? Math.max(6, lane.width - cursor)
        : Math.max(6, lane.height - cursor);
      const finalSpan = Math.min(span, availableSpan);
      const geometry = createLaneRect(lane, cursor, finalSpan, corridorIsHorizontal);
      const actualArea = round(rectArea(geometry), 1);

      placedRooms.push({
        id: `${entry.floor.id}-${entry.room.id}`,
        roomTypeId: entry.room.id,
        name: entry.room.name,
        department: entry.room.department,
        floorId: entry.floor.id,
        geometry,
        targetArea: entry.room.targetArea,
        actualArea,
        preferredOrientation: entry.room.preferredOrientation,
        color: entry.room.color,
        source: "engine",
        laneIndex: chosenLane.laneIndex,
        ...createEmptyRoom()
      });

      return placedRooms;
    }, []);
}
