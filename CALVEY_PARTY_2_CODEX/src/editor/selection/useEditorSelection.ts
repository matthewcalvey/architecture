import { PlanModel, PlanRoom } from "../../models/types";

export function getSelectedFloor(plan: PlanModel | null, floorId: string | null) {
  if (!plan) {
    return null;
  }

  return plan.floors.find((floor) => floor.id === floorId) ?? plan.floors[0] ?? null;
}

export function getSelectedRoom(
  plan: PlanModel | null,
  roomId: string | null
): PlanRoom | null {
  if (!plan || !roomId) {
    return null;
  }

  return (
    plan.floors.flatMap((floor) => floor.rooms).find((room) => room.id === roomId) ?? null
  );
}
