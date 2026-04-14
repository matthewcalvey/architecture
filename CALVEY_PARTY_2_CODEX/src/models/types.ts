export type Severity = "info" | "warning" | "error";
export type Orientation = "north" | "south" | "east" | "west" | "neutral";
export type FloorPreference = "ground" | "upper" | "any";
export type CorridorType = "single_loaded" | "double_loaded" | "hybrid";
export type AdjacencyRelation = "required" | "preferred" | "separated" | "stacked";
export type AnchorType = "core" | "shaft" | "structure_line";
export type SessionEventType =
  | "generate_plan"
  | "update_weight"
  | "change_program"
  | "move_room"
  | "resize_room"
  | "move_room_floor"
  | "commit_note"
  | "reset_to_engine"
  | "import_project"
  | "export_project";
export type DerivedSignalKind = "moved" | "resized" | "reassigned_floor";

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SiteObstacle {
  id: string;
  name: string;
  type: "building" | "setback" | "noise" | "view_corridor";
  polygon: Point[];
}

export interface Anchor {
  id: string;
  name: string;
  type: AnchorType;
  floorIndex?: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  x2?: number;
  y2?: number;
}

export interface SiteContext {
  footprint: Point[];
  trueNorthDeg: number;
  latitude: number;
  longitude: number;
  context: SiteObstacle[];
  anchors: Anchor[];
}

export interface ScoringWeights {
  adjacency: number;
  daylight: number;
  circulation: number;
  structure: number;
  compactness: number;
}

export interface ProgramRoomDefinition {
  id: string;
  name: string;
  department: string;
  targetArea: number;
  minWidth: number;
  minDepth: number;
  aspectRatioRange: [number, number];
  preferredOrientation: Orientation;
  floorPreference: FloorPreference;
  color: string;
}

export interface AdjacencyEdge {
  from: string;
  to: string;
  relation: AdjacencyRelation;
}

export interface BuildingProgramDefinition {
  id: string;
  name: string;
  description: string;
  maxFloors: number;
  corridorType: CorridorType;
  roomDefinitions: ProgramRoomDefinition[];
  adjacency: AdjacencyEdge[];
  aliases: string[];
}

export interface ProgramCatalog {
  definitions: BuildingProgramDefinition[];
  aliasMap: Record<string, string>;
}

export interface RoomScoreBreakdown {
  total: number;
  areaFit: number;
  adjacency: number;
  daylight: number;
  circulation: number;
  structure: number;
  compactness: number;
  notes: string[];
}

export interface RoomConfidence {
  value: number;
  label: "low" | "medium" | "high";
  reasons: string[];
}

export interface PlanRoom {
  id: string;
  roomTypeId: string;
  name: string;
  department: string;
  floorId: string;
  geometry: Rect;
  targetArea: number;
  actualArea: number;
  preferredOrientation: Orientation;
  color: string;
  score: RoomScoreBreakdown;
  confidence: RoomConfidence;
  source: "engine" | "user";
}

export interface FloorPlan {
  id: string;
  label: string;
  index: number;
  elevationFt: number;
  polygon: Point[];
  corridor: Rect;
  rooms: PlanRoom[];
}

export interface PlanWarning {
  id: string;
  code: string;
  severity: Severity;
  message: string;
}

export interface PlanScoreSummary {
  overall: number;
  adjacency: number;
  daylight: number;
  circulation: number;
  structure: number;
  compactness: number;
}

export interface RoomScheduleItem {
  roomId: string;
  roomName: string;
  floorLabel: string;
  department: string;
  targetArea: number;
  actualArea: number;
}

export interface PlanModel {
  id: string;
  generatedAt: string;
  seed: string;
  inputSignature: string;
  buildingTypeId: string;
  floors: FloorPlan[];
  warnings: PlanWarning[];
  score: PlanScoreSummary;
  roomSchedule: RoomScheduleItem[];
}

export interface ProgramSelection {
  buildingTypeId: string;
}

export interface SessionEvent {
  id: string;
  type: SessionEventType;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface DerivedSignal {
  id: string;
  roomId: string;
  roomName: string;
  kind: DerivedSignalKind;
  magnitude: number;
  detail: string;
}

export interface SessionState {
  events: SessionEvent[];
  signals: DerivedSignal[];
}

export interface PartyProject {
  id: string;
  name: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  site: SiteContext;
  programSelection: ProgramSelection;
  weights: ScoringWeights;
  seed: string;
  notes: string;
  engineProposal: PlanModel | null;
  committedPlan: PlanModel | null;
  session: SessionState;
}
