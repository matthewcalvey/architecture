import {
  BuildingProgramDefinition,
  PlanModel,
  PlanRoom
} from "../../models/types";
import { clamp } from "../../utils/math";

function labelConfidence(value: number): "low" | "medium" | "high" {
  if (value >= 0.74) {
    return "high";
  }

  if (value >= 0.5) {
    return "medium";
  }

  return "low";
}

function explainConfidence(room: PlanRoom): string[] {
  const reasons: string[] = [];

  if (room.score.adjacency < 0.6) {
    reasons.push("Adjacency obligations are still loose.");
  }

  if (room.score.areaFit < 0.7) {
    reasons.push("Area fit is outside the preferred tolerance.");
  }

  if (room.score.compactness < 0.7) {
    reasons.push("Room proportions are strained.");
  }

  if (room.score.daylight >= 0.8) {
    reasons.push("Orientation is working well for daylight.");
  }

  if (!reasons.length) {
    reasons.push("Room metrics sit inside the expected performance band.");
  }

  return reasons;
}

function buildRoomConfidence(room: PlanRoom): PlanRoom["confidence"] {
  const value = clamp(
    room.score.total * 0.55 +
      room.score.areaFit * 0.15 +
      room.score.adjacency * 0.15 +
      room.score.compactness * 0.15,
    0.12,
    0.98
  );

  return {
    value,
    label: labelConfidence(value),
    reasons: explainConfidence(room)
  };
}

export function estimateConfidence(
  plan: PlanModel,
  _program: BuildingProgramDefinition
): PlanModel {
  return {
    ...plan,
    floors: plan.floors.map((floor) => ({
      ...floor,
      rooms: floor.rooms.map((room) => ({
        ...room,
        confidence: buildRoomConfidence(room)
      }))
    }))
  };
}
