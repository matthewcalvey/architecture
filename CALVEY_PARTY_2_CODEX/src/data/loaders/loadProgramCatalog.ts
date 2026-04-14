import { ProgramCatalog } from "../../models/types";
import { ProgramCatalogAdapter } from "../adapters/programAdapter";
import { validateProgramCatalog } from "../validators/projectValidators";

export function loadProgramCatalog(
  adapter: ProgramCatalogAdapter
): ProgramCatalog {
  const catalog = adapter.getCatalog();
  validateProgramCatalog(catalog);
  return catalog;
}
