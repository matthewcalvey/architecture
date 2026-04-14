import { create } from "zustand";
import { loadProgramCatalog } from "../data/loaders/loadProgramCatalog";
import { localProgramCatalogAdapter } from "../data/adapters/programAdapter";
import { recomputePlanDiagnostics, generatePlan } from "../engine/routing/generatePlan";
import { buildFloorSvg, downloadTextFile, serializeProject } from "../exporters/projectExport";
import { createDefaultProject } from "../models/defaults";
import {
  PartyProject,
  PlanModel,
  PlanRoom,
  ProgramCatalog,
  Rect,
  SessionEventType
} from "../models/types";
import {
  loadProjectFromStorage,
  saveProjectToStorage
} from "../persistence/localStorage";
import { withLoggedEvent } from "../sessions/sessionLogger";
import { cloneValue } from "../utils/clone";
import { validateProject } from "../data/validators/projectValidators";
import { getSelectedFloor } from "../editor/selection/useEditorSelection";
import { round } from "../utils/math";

const catalog = loadProgramCatalog(localProgramCatalogAdapter);

function resolveProgram(project: PartyProject) {
  const definition = localProgramCatalogAdapter.getDefinition(
    project.programSelection.buildingTypeId
  );

  if (!definition) {
    throw new Error(`Unknown building program: ${project.programSelection.buildingTypeId}`);
  }

  return definition;
}

function touchProject(project: PartyProject): PartyProject {
  return {
    ...project,
    updatedAt: new Date().toISOString()
  };
}

function syncCommittedPlan(
  project: PartyProject,
  nextPlan: PlanModel,
  eventType?: SessionEventType,
  payload: Record<string, unknown> = {}
): PartyProject {
  const program = resolveProgram(project);
  const committedPlan = recomputePlanDiagnostics(
    nextPlan,
    project.site,
    program,
    project.weights
  );
  const nextProject = touchProject({
    ...project,
    committedPlan
  });

  return eventType ? withLoggedEvent(nextProject, eventType, payload) : nextProject;
}

function updateRoomInPlan(
  plan: PlanModel,
  roomId: string,
  updater: (room: PlanRoom) => PlanRoom
): PlanModel {
  return {
    ...plan,
    floors: plan.floors.map((floor) => ({
      ...floor,
      rooms: floor.rooms.map((room) => (room.id === roomId ? updater(room) : room))
    }))
  };
}

function moveRoomBetweenFloors(
  plan: PlanModel,
  roomId: string,
  targetFloorId: string,
  geometry: Rect
): PlanModel {
  let movedRoom: PlanRoom | null = null;

  const strippedFloors = plan.floors.map((floor) => ({
    ...floor,
    rooms: floor.rooms.filter((room) => {
      if (room.id === roomId) {
        movedRoom = room;
        return false;
      }

      return true;
    })
  }));

  if (!movedRoom) {
    return plan;
  }

  const roomToMove: PlanRoom = movedRoom;

  return {
    ...plan,
    floors: strippedFloors.map((floor) => {
      if (floor.id !== targetFloorId) {
        return floor;
      }

      return {
        ...floor,
        rooms: [
          ...floor.rooms,
          {
            ...roomToMove,
            floorId: targetFloorId,
            geometry,
            actualArea: round(geometry.width * geometry.height, 1),
            source: "user"
          }
        ]
      };
    })
  };
}

function createGeneratedProject(project: PartyProject): PartyProject {
  const program = resolveProgram(project);
  const engineProposal = generatePlan(
    project.site,
    program,
    project.weights,
    project.seed
  );
  const committedPlan = cloneValue(engineProposal);

  return withLoggedEvent(
    {
      ...project,
      updatedAt: new Date().toISOString(),
      engineProposal,
      committedPlan
    },
    "generate_plan",
    {
      buildingTypeId: program.id
    }
  );
}

export interface PartyStore {
  hydrated: boolean;
  catalog: ProgramCatalog;
  project: PartyProject;
  selectedFloorId: string | null;
  selectedRoomId: string | null;
  hydrate: () => void;
  selectFloor: (floorId: string) => void;
  selectRoom: (roomId: string | null) => void;
  generateBestGuess: () => void;
  updateProgramSelection: (buildingTypeId: string) => void;
  updateWeight: (key: keyof PartyProject["weights"], value: number) => void;
  updateSiteMeta: (
    key: "trueNorthDeg" | "latitude" | "longitude",
    value: number
  ) => void;
  updateSeed: (seed: string) => void;
  commitRoomGeometry: (
    roomId: string,
    geometry: Rect,
    eventType: "move_room" | "resize_room"
  ) => void;
  moveRoomToFloor: (roomId: string, targetFloorId: string, geometry: Rect) => void;
  commitNotes: (notes: string) => void;
  resetToEngine: () => void;
  importProject: (rawProject: string) => void;
  exportProjectJson: () => void;
  exportCurrentFloorSvg: () => void;
}

export const usePartyStore = create<PartyStore>((set, get) => ({
  hydrated: false,
  catalog,
  project: createDefaultProject(),
  selectedFloorId: null,
  selectedRoomId: null,

  hydrate: () => {
    const storedProject = loadProjectFromStorage();
    const project = storedProject ?? createDefaultProject();
    const generatedProject = project.engineProposal ? project : createGeneratedProject(project);
    const firstFloor = generatedProject.committedPlan?.floors[0]?.id ?? null;

    set({
      hydrated: true,
      project: generatedProject,
      selectedFloorId: firstFloor,
      selectedRoomId: null
    });

    saveProjectToStorage(generatedProject);
  },

  selectFloor: (floorId) => set({ selectedFloorId: floorId }),
  selectRoom: (roomId) => set({ selectedRoomId: roomId }),

  generateBestGuess: () => {
    const project = get().project;
    const nextProject = createGeneratedProject(project);
    const firstFloor = nextProject.committedPlan?.floors[0]?.id ?? null;

    set({
      project: nextProject,
      selectedFloorId: firstFloor,
      selectedRoomId: null
    });

    saveProjectToStorage(nextProject);
  },

  updateProgramSelection: (buildingTypeId) => {
    const project = withLoggedEvent(
      touchProject({
        ...get().project,
        programSelection: {
          buildingTypeId
        }
      }),
      "change_program",
      { buildingTypeId }
    );

    set({ project });
    saveProjectToStorage(project);
  },

  updateWeight: (key, value) => {
    const project = get().project;
    const nextProject = touchProject({
      ...project,
      weights: {
        ...project.weights,
        [key]: value
      }
    });
    const recomputedProject = nextProject.committedPlan
      ? syncCommittedPlan(nextProject, nextProject.committedPlan)
      : nextProject;
    const loggedProject = withLoggedEvent(recomputedProject, "update_weight", {
      key,
      value
    });

    set({ project: loggedProject });
    saveProjectToStorage(loggedProject);
  },

  updateSiteMeta: (key, value) => {
    const project = get().project;
    const nextProject = touchProject({
      ...project,
      site: {
        ...project.site,
        [key]: value
      }
    });
    const recomputedProject = nextProject.committedPlan
      ? syncCommittedPlan(nextProject, nextProject.committedPlan)
      : nextProject;

    set({ project: recomputedProject });
    saveProjectToStorage(recomputedProject);
  },

  updateSeed: (seed) => {
    const project = touchProject({
      ...get().project,
      seed
    });

    set({ project });
    saveProjectToStorage(project);
  },

  commitRoomGeometry: (roomId, geometry, eventType) => {
    const project = get().project;

    if (!project.committedPlan) {
      return;
    }

    const nextPlan = updateRoomInPlan(project.committedPlan, roomId, (room) => ({
      ...room,
      geometry,
      actualArea: round(geometry.width * geometry.height, 1),
      source: "user"
    }));
    const nextProject = syncCommittedPlan(project, nextPlan, eventType, {
      roomId
    });

    set({ project: nextProject });
    saveProjectToStorage(nextProject);
  },

  moveRoomToFloor: (roomId, targetFloorId, geometry) => {
    const project = get().project;

    if (!project.committedPlan) {
      return;
    }

    const nextPlan = moveRoomBetweenFloors(
      project.committedPlan,
      roomId,
      targetFloorId,
      geometry
    );
    const nextProject = syncCommittedPlan(project, nextPlan, "move_room_floor", {
      roomId,
      targetFloorId
    });

    set({
      project: nextProject,
      selectedFloorId: targetFloorId,
      selectedRoomId: roomId
    });
    saveProjectToStorage(nextProject);
  },

  commitNotes: (notes) => {
    const nextProject = withLoggedEvent(
      touchProject({
        ...get().project,
        notes
      }),
      "commit_note",
      {
        characters: notes.length
      }
    );

    set({ project: nextProject });
    saveProjectToStorage(nextProject);
  },

  resetToEngine: () => {
    const project = get().project;

    if (!project.engineProposal) {
      return;
    }

    const nextProject = withLoggedEvent(
      touchProject({
        ...project,
        committedPlan: cloneValue(project.engineProposal)
      }),
      "reset_to_engine",
      {}
    );

    set({
      project: nextProject,
      selectedFloorId: nextProject.committedPlan?.floors[0]?.id ?? null,
      selectedRoomId: null
    });
    saveProjectToStorage(nextProject);
  },

  importProject: (rawProject) => {
    const importedProject = JSON.parse(rawProject) as PartyProject;
    validateProject(importedProject);
    const loggedProject = withLoggedEvent(importedProject, "import_project", {
      importedAt: new Date().toISOString()
    });
    const floorId = loggedProject.committedPlan?.floors[0]?.id ?? null;

    set({
      project: loggedProject,
      selectedFloorId: floorId,
      selectedRoomId: null
    });
    saveProjectToStorage(loggedProject);
  },

  exportProjectJson: () => {
    const project = withLoggedEvent(get().project, "export_project", {
      format: "json"
    });

    set({ project });
    saveProjectToStorage(project);
    downloadTextFile(
      "calvey-party-2-project.json",
      serializeProject(project),
      "application/json"
    );
  },

  exportCurrentFloorSvg: () => {
    const { project, selectedFloorId } = get();
    const selectedFloor = getSelectedFloor(project.committedPlan, selectedFloorId);

    if (!selectedFloor) {
      return;
    }

    const loggedProject = withLoggedEvent(project, "export_project", {
      format: "svg",
      floorId: selectedFloor.id
    });

    set({ project: loggedProject });
    saveProjectToStorage(loggedProject);
    downloadTextFile(
      `${selectedFloor.label.toLowerCase().replace(/\s+/g, "-")}.svg`,
      buildFloorSvg(selectedFloor, loggedProject.site),
      "image/svg+xml"
    );
  }
}));
