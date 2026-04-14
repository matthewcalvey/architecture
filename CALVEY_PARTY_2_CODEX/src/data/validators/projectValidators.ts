import {
  PartyProject,
  ProgramCatalog,
  ScoringWeights,
  SiteContext
} from "../../models/types";

export function validateProgramCatalog(catalog: ProgramCatalog): void {
  if (!catalog.definitions.length) {
    throw new Error("Program catalog must define at least one building type.");
  }
}

export function validateSiteContext(site: SiteContext): void {
  if (site.footprint.length < 3) {
    throw new Error("Footprint polygon must contain at least three points.");
  }
}

export function validateWeights(weights: ScoringWeights): void {
  const total =
    weights.adjacency +
    weights.daylight +
    weights.circulation +
    weights.structure +
    weights.compactness;

  if (total <= 0) {
    throw new Error("At least one scoring weight must be positive.");
  }
}

export function validateProject(project: PartyProject): void {
  validateSiteContext(project.site);
  validateWeights(project.weights);
}
