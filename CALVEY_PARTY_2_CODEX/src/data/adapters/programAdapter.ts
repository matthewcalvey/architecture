import {
  BuildingProgramDefinition,
  ProgramCatalog
} from "../../models/types";
import { slugify } from "../../utils/id";
import { localProgramCatalog } from "../fixtures/programCatalog";

export interface ProgramCatalogAdapter {
  getCatalog(): ProgramCatalog;
  getDefinition(buildingTypeId: string): BuildingProgramDefinition | null;
}

export const localProgramCatalogAdapter: ProgramCatalogAdapter = {
  getCatalog(): ProgramCatalog {
    return localProgramCatalog;
  },

  getDefinition(buildingTypeId: string): BuildingProgramDefinition | null {
    const catalog = localProgramCatalog;
    const normalized = slugify(buildingTypeId).replace(/-/g, "_");
    const aliasTarget =
      catalog.aliasMap[buildingTypeId] ??
      catalog.aliasMap[normalized] ??
      buildingTypeId;

    return (
      catalog.definitions.find((definition) => definition.id === aliasTarget) ?? null
    );
  }
};
