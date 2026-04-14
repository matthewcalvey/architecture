import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../src/models/defaults";
import { localProgramCatalogAdapter } from "../src/data/adapters/programAdapter";
import { generatePlan } from "../src/engine/routing/generatePlan";

function sanitizePlan(plan: ReturnType<typeof generatePlan>) {
  return {
    id: plan.id,
    seed: plan.seed,
    buildingTypeId: plan.buildingTypeId,
    floors: plan.floors.map((floor) => ({
      id: floor.id,
      rooms: floor.rooms.map((room) => ({
        id: room.id,
        floorId: room.floorId,
        geometry: room.geometry,
        score: room.score,
        confidence: room.confidence
      }))
    })),
    score: plan.score,
    warnings: plan.warnings
  };
}

describe("generatePlan", () => {
  it("is deterministic for the same site, program, weights, and seed", () => {
    const project = createDefaultProject();
    const program = localProgramCatalogAdapter.getDefinition(
      project.programSelection.buildingTypeId
    );

    if (!program) {
      throw new Error("Expected default program to exist.");
    }

    const firstPlan = generatePlan(project.site, program, project.weights, project.seed);
    const secondPlan = generatePlan(project.site, program, project.weights, project.seed);

    expect(sanitizePlan(secondPlan)).toEqual(sanitizePlan(firstPlan));
  });

  it("produces a single scored multi-floor best guess when the program exceeds one floor", () => {
    const project = createDefaultProject();
    const program = localProgramCatalogAdapter.getDefinition(
      "maker_mixed_use_infill"
    );

    if (!program) {
      throw new Error("Expected fixture program to exist.");
    }

    const plan = generatePlan(project.site, program, project.weights, project.seed);

    expect(plan.floors.length).toBeGreaterThan(1);
    expect(plan.roomSchedule.length).toBe(program.roomDefinitions.length);
    expect(plan.score.overall).toBeGreaterThan(0.45);
  });
});
