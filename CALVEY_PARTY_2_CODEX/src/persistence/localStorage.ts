import { PartyProject } from "../models/types";

const STORAGE_KEY = "calvey_party_2_project";

export function saveProjectToStorage(project: PartyProject): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
}

export function loadProjectFromStorage(): PartyProject | null {
  const rawValue = localStorage.getItem(STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as PartyProject;
  } catch {
    return null;
  }
}

export function clearProjectStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
}
