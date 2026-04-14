// Data loader — imports all program database JSON files and provides them as a single object
import master from './building_program_database_master.json';

// Import all building type files
const buildingTypeModules = import.meta.glob('./program_database_*.json', { eager: true });

export const masterIndex = master;

export const buildingTypes = {};
for (const [path, mod] of Object.entries(buildingTypeModules)) {
  const filename = path.split('/').pop();
  const key = filename.replace('program_database_', '').replace('.json', '');
  buildingTypes[key] = mod.default || mod;
}

// Get sorted list of building type entries from master
export function getBuildingTypeList() {
  return (master.databases || []).map(db => {
    const key = db.json.replace('program_database_', '').replace('.json', '');
    return {
      ...db,
      key,
      data: buildingTypes[key] || null
    };
  }).filter(b => b.data);
}

// Get a single building type by key
export function getBuildingType(key) {
  return buildingTypes[key] || null;
}

// Get all spaces across all building types
export function getAllSpaces() {
  const spaces = [];
  for (const [key, bt] of Object.entries(buildingTypes)) {
    if (bt.space_library) {
      for (const space of bt.space_library) {
        spaces.push({ ...space, _building_type: bt.building_type, _building_key: key });
      }
    }
  }
  return spaces;
}

// Get stats
export function getStats() {
  const btList = getBuildingTypeList();
  let totalSpaces = 0;
  let totalEdges = 0;
  for (const bt of btList) {
    totalSpaces += bt.data?.space_library?.length || 0;
    totalEdges += bt.data?.adjacency_edges?.length || 0;
  }
  return {
    buildingTypes: btList.length,
    totalSpaces,
    totalEdges,
    schemaVersion: master.schema_version,
    createdDate: master.created_date
  };
}
