import {
  DerivedSignal,
  PartyProject,
  PlanModel,
  SessionEvent,
  SessionEventType
} from "../models/types";
import { createClientId } from "../utils/id";
import { distance } from "../utils/math";
import { rectCenter } from "../engine/geometry/polygon";

export function createSessionEvent(
  type: SessionEventType,
  payload: Record<string, unknown>
): SessionEvent {
  return {
    id: createClientId("event"),
    type,
    timestamp: new Date().toISOString(),
    payload
  };
}

function buildSignals(
  baselinePlan: PlanModel | null,
  committedPlan: PlanModel | null
): DerivedSignal[] {
  if (!baselinePlan || !committedPlan) {
    return [];
  }

  const baselineRooms = new Map(
    baselinePlan.floors.flatMap((floor) => floor.rooms).map((room) => [room.id, room])
  );

  return committedPlan.floors.flatMap((floor) =>
    floor.rooms.flatMap((room) => {
      const baselineRoom = baselineRooms.get(room.id);

      if (!baselineRoom) {
        return [];
      }

      const signals: DerivedSignal[] = [];
      const centroidShift = distance(
        rectCenter(baselineRoom.geometry),
        rectCenter(room.geometry)
      );
      const widthShift = Math.abs(baselineRoom.geometry.width - room.geometry.width);
      const heightShift = Math.abs(baselineRoom.geometry.height - room.geometry.height);

      if (room.floorId !== baselineRoom.floorId) {
        signals.push({
          id: `${room.id}-floor`,
          roomId: room.id,
          roomName: room.name,
          kind: "reassigned_floor",
          magnitude: floor.index + 1,
          detail: `${room.name} moved from ${baselineRoom.floorId} to ${room.floorId}.`
        });
      }

      if (centroidShift > 1.5) {
        signals.push({
          id: `${room.id}-move`,
          roomId: room.id,
          roomName: room.name,
          kind: "moved",
          magnitude: Number(centroidShift.toFixed(1)),
          detail: `${room.name} shifted ${centroidShift.toFixed(1)} ft from the engine proposal.`
        });
      }

      if (widthShift > 1 || heightShift > 1) {
        signals.push({
          id: `${room.id}-resize`,
          roomId: room.id,
          roomName: room.name,
          kind: "resized",
          magnitude: Number(Math.max(widthShift, heightShift).toFixed(1)),
          detail: `${room.name} was reproportioned by up to ${Math.max(widthShift, heightShift).toFixed(1)} ft.`
        });
      }

      return signals;
    })
  );
}

export function withLoggedEvent(
  project: PartyProject,
  eventType: SessionEventType,
  payload: Record<string, unknown>
): PartyProject {
  const event = createSessionEvent(eventType, payload);

  return {
    ...project,
    updatedAt: new Date().toISOString(),
    session: {
      events: [...project.session.events, event],
      signals: buildSignals(project.engineProposal, project.committedPlan)
    }
  };
}
