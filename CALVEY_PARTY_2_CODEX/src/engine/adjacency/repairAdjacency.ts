import {
  AdjacencyEdge,
  BuildingProgramDefinition,
  FloorPlan,
  PlanRoom
} from "../../models/types";

function buildComponentMap(
  rooms: PlanRoom[],
  adjacency: AdjacencyEdge[]
): Map<string, number> {
  const roomIds = new Set(rooms.map((room) => room.roomTypeId));
  const edges = adjacency.filter(
    (edge) =>
      (edge.relation === "required" || edge.relation === "preferred") &&
      roomIds.has(edge.from) &&
      roomIds.has(edge.to)
  );
  const neighbors = new Map<string, string[]>();

  rooms.forEach((room) => neighbors.set(room.roomTypeId, []));
  edges.forEach((edge) => {
    neighbors.get(edge.from)?.push(edge.to);
    neighbors.get(edge.to)?.push(edge.from);
  });

  const componentMap = new Map<string, number>();
  let componentIndex = 0;

  rooms.forEach((room) => {
    if (componentMap.has(room.roomTypeId)) {
      return;
    }

    const queue = [room.roomTypeId];
    componentMap.set(room.roomTypeId, componentIndex);

    while (queue.length) {
      const current = queue.shift() as string;
      const linkedRooms = neighbors.get(current) ?? [];

      linkedRooms.forEach((linkedRoomId) => {
        if (!componentMap.has(linkedRoomId)) {
          componentMap.set(linkedRoomId, componentIndex);
          queue.push(linkedRoomId);
        }
      });
    }

    componentIndex += 1;
  });

  return componentMap;
}

export function repairAdjacency(
  floors: FloorPlan[],
  program: BuildingProgramDefinition
): FloorPlan[] {
  return floors.map((floor) => {
    const componentMap = buildComponentMap(floor.rooms, program.adjacency);
    const horizontal = floor.corridor.width >= floor.corridor.height;

    const repairedRooms = [...floor.rooms]
      .sort((roomA, roomB) => {
        const componentA = componentMap.get(roomA.roomTypeId) ?? 999;
        const componentB = componentMap.get(roomB.roomTypeId) ?? 999;

        if (componentA !== componentB) {
          return componentA - componentB;
        }

        return horizontal
          ? roomA.geometry.x - roomB.geometry.x
          : roomA.geometry.y - roomB.geometry.y;
      })
      .map((room, index, allRooms) => {
        if (index === 0) {
          return room;
        }

        const previous = allRooms[index - 1];

        if (horizontal) {
          return {
            ...room,
            geometry: {
              ...room.geometry,
              x: previous.geometry.x + previous.geometry.width
            }
          };
        }

        return {
          ...room,
          geometry: {
            ...room.geometry,
            y: previous.geometry.y + previous.geometry.height
          }
        };
      });

    return {
      ...floor,
      rooms: repairedRooms
    };
  });
}
