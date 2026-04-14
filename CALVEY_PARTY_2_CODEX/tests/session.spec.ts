import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../src/models/defaults";
import { localProgramCatalogAdapter } from "../src/data/adapters/programAdapter";
import { generatePlan } from "../src/engine/routing/generatePlan";
import { withLoggedEvent } from "../src/sessions/sessionLogger";

describe("sessionLogger", () => {
  it("derives meaningful geometry signals from engine to committed plan deltas", () => {
    const project = createDefaultProject();
    const program = localProgramCatalogAdapter.getDefinition(
      project.programSelection.buildingTypeId
    );

    if (!program) {
      throw new Error("Expected program definition to exist.");
    }

    const engineProposal = generatePlan(project.site, program, project.weights, project.seed);
    const committedPlan = {
      ...engineProposal,
      floors: engineProposal.floors.map((floor, floorIndex) => ({
        ...floor,
        rooms: floor.rooms.map((room, roomIndex) =>
          floorIndex === 0 && roomIndex === 0
            ? {
                ...room,
                geometry: {
                  ...room.geometry,
                  x: room.geometry.x + 6,
                  width: room.geometry.width + 4
                }
              }
            : room
        )
      }))
    };

    const loggedProject = withLoggedEvent(
      {
        ...project,
        engineProposal,
        committedPlan
      },
      "move_room",
      {
        roomId: committedPlan.floors[0].rooms[0].id
      }
    );

    expect(loggedProject.session.signals.some((signal) => signal.kind === "moved")).toBe(
      true
    );
    expect(
      loggedProject.session.signals.some((signal) => signal.kind === "resized")
    ).toBe(true);
  });
});
