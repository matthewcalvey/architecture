#!/usr/bin/env node
/**
 * Adds `category` field from program_database_*.json to each room in parti_runtime.json.
 * Also embeds the unified CAT_COLORS palette so PARTI uses the same colors as PROGRAM.
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..');
const PARTI_PATH = path.join(DATA_DIR, 'parti_runtime.json');

// The canonical CAT_COLORS palette from CALVEY PROGRAM
const CAT_COLORS = {
  "Public/Entry":"#d4a843","Public/Commons":"#c9a959","Public/Support":"#b89a50",
  "Public/Primary":"#dbb24e","Public/Comfort":"#c4944a","Public/Program":"#d0a040",
  "Public/Service":"#b8923e","Public/Security":"#a88740",
  "Administration":"#9b7ec8","Administration/Academic":"#8a6fb8",
  "Work":"#5eb8d8","Meeting":"#4ea8cc",
  "Learning":"#5dba72","Learning Commons":"#4aad62","Instruction":"#68c47e",
  "Education":"#52b268","Training":"#60be78",
  "Clinical":"#d05a42","Clinical/Support":"#c04e38","Clinical/Diagnostics":"#b84830",
  "Laboratory":"#3db8a0","Laboratory/Support":"#35a890",
  "Food Service":"#d4963a","Revenue":"#cc8a30","Revenue/Food":"#d49a40","Revenue/Retail":"#c08030",
  "Amenity":"#5a9ec8","Amenity/Outdoor":"#4a94ba","Amenity/Operations":"#5090b4","Amenity/Social":"#4c8cb8",
  "Residential":"#c87a8a","Residential/Component":"#b86e7e","Rooms":"#d08494",
  "Residential/Suite":"#d48898","Residential/Apartment":"#ba7282","Residential/Room":"#c0768a",
  "Residential/Memory Care":"#ae6a78","Residential/Support":"#a86474",
  "Guest Rooms":"#c87a8a","Living Quarters":"#b87080",
  "Athletics":"#e08850","Active/Primary":"#d87c44","Active/Community":"#cc7040","Active/Aquatic":"#c46838",
  "Assembly":"#6a6eb8","Event":"#6268b4","Performance":"#5c60b0","Performance/BOH":"#4e52a0","Performance/Technical":"#5458a8",
  "Worship/Primary":"#9070b8","Worship/Support":"#8060a8","Worship/Technical":"#7858a0",
  "Exhibition":"#b8946a","Community":"#a8886a","Community/Support":"#988060",
  "Circulation":"#607080","Circulation/Core":"#506070","Circulation/BOH":"#586878",
  "Circulation/Pedestrian":"#687888","Circulation/Vehicle":"#586470",
  "Operations":"#6a7a88","Operations/Circulation":"#607080","Operations/BOH":"#5a6a78",
  "Operations/Logistics":"#506070","Operations/Support":"#586878",
  "Operations/Office":"#647888","Operations/Primary":"#5e7080",
  "Operations/Resident":"#687a8a","Operations/Special":"#5a6c7c",
  "Operations/Telecom":"#4e6270","Operations/Multimodal":"#607282","Operations/Aquatic":"#507080",
  "Support":"#708878","Support/Amenity":"#608070","Support/BOH":"#587868",
  "Support/Family":"#689078","Support/Multimodal":"#607868","Support/Wet":"#588070",
  "MEP":"#485868","MEP/Tech":"#405060","MEP/Power":"#384858","MEP/Cooling":"#3e5060","MEP/Aquatic":"#364850",
  "Safety/Operations":"#8a4848",
  "Mobility":"#708898","Parking":"#4a5a68",
  "Storage":"#5a6058","Loading":"#505850",
  "Patient Care":"#d05a42",
  "Specialty Academic":"#68c47e","Specialty Support":"#5dba72",
  "Passenger Processing – Embarkation":"#d4a843",
  "Passenger Processing – Debarkation":"#5eb8d8",
  "Baggage & Logistics":"#b8946a",
  "Vertical Circulation":"#607080",
  "Operations & Back-of-House":"#6a7a88",
  "Building Systems & MEP":"#485868",
  "Public Amenities":"#5a9ec8",
  "Event & Conference Venue (Upper Level)":"#6a6eb8",
  "Community Recreation & Culture (Ground Level)":"#5dba72",
  "Event Support & Logistics":"#708878",
  "Event Operations & Back-of-House":"#9b7ec8",
  "A":"#d4a843","B":"#5eb8d8","C":"#b8946a","D":"#607080",
  "E":"#6a7a88","F":"#485868","G":"#5a9ec8"
};

// 1. Build space_id → category map from all program databases
const categoryMap = {};  // space_id → category
const dbFiles = fs.readdirSync(DATA_DIR).filter(f => f.startsWith('program_database_') && f.endsWith('.json'));

for (const f of dbFiles) {
  try {
    const db = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'));
    const spaces = db.space_library || db.spaces || [];
    for (const sp of spaces) {
      const id = sp.id || sp.space_id;
      const cat = sp.category || sp.category_name;
      if (id && cat) {
        categoryMap[id] = cat;
      }
    }
  } catch (e) {
    console.warn(`Skipping ${f}: ${e.message}`);
  }
}

console.log(`Built category map: ${Object.keys(categoryMap).length} space_ids`);

// 2. Read parti_runtime.json
const parti = JSON.parse(fs.readFileSync(PARTI_PATH, 'utf8'));

// 3. Add category to each room, and embed CAT_COLORS
let updated = 0, missing = 0;
const missingIds = [];

for (const [typeName, prog] of Object.entries(parti.programs)) {
  if (!prog.rooms) continue;
  for (const room of prog.rooms) {
    const sid = room.space_id;
    if (sid && categoryMap[sid]) {
      room.category = categoryMap[sid];
      updated++;
    } else {
      // Fallback: try to infer category from dept
      if (!room.category) {
        missingIds.push(`${typeName}: ${sid} (${room.name})`);
        missing++;
      }
    }
  }
}

// 4. Embed the CAT_COLORS palette
parti.cat_colors = CAT_COLORS;
parti.compiled_date = new Date().toISOString().slice(0, 10);

// 5. Write updated file
fs.writeFileSync(PARTI_PATH, JSON.stringify(parti, null, 2));

console.log(`Updated ${updated} rooms with category field`);
console.log(`Missing ${missing} mappings:`);
missingIds.forEach(id => console.log(`  - ${id}`));
console.log('Done. CAT_COLORS palette embedded in parti_runtime.json');
