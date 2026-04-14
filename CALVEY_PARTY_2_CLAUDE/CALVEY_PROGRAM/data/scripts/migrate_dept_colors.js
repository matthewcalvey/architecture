#!/usr/bin/env node
/**
 * One-shot migration: update department_palette colors in every
 * program_database_*.json AND parti_runtime.json to match the
 * unified DEPARTMENT_COLORS palette.
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..');

// Canonical department colors — same as generate_parti_configs.js & departmentColors.js
const DEPT_COLORS = {
  'Support': '#708878', 'Meeting': '#4ea8cc', 'Workspace': '#5eb8d8',
  'Core': '#607080', 'Admin': '#9b7ec8', 'Commons': '#c9a959',
  'Classrooms': '#5dba72', 'Academic': '#5dba72', 'Clinical': '#d05a42',
  'Public': '#d4a843', 'Guest': '#c87a8a', 'BOH': '#5a6a78',
  'Amenity': '#5a9ec8', 'Units': '#c87a8a', 'Residential': '#c87a8a',
  'Lab': '#3db8a0', 'Office': '#9b7ec8', 'Sales': '#cc8a30',
  'Production': '#6a7a88', 'Gallery': '#b8946a', 'Exhibition': '#b8946a',
  'Worship': '#9070b8', 'Community': '#a8886a', 'Activity': '#e08850',
  'Data Hall': '#485868', 'Parking': '#4a5a68', 'Transit': '#607282',
  'Apparatus': '#8a4848', 'Living': '#c87a8a', 'Processing': '#6a7a88',
  'Assembly': '#6a6eb8', 'Common': '#c9a959',
};

function matchDept(name) {
  if (DEPT_COLORS[name]) return DEPT_COLORS[name];
  const lc = name.toLowerCase();
  for (const [k, v] of Object.entries(DEPT_COLORS)) {
    if (lc.includes(k.toLowerCase())) return v;
  }
  return null;
}

// 1. Update program_database_*.json files
const dbFiles = fs.readdirSync(DATA_DIR).filter(f => f.startsWith('program_database_') && f.endsWith('.json'));
let totalUpdated = 0;

for (const f of dbFiles) {
  const fp = path.join(DATA_DIR, f);
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const palette = data.parti_config?.department_palette;
  if (!palette) continue;
  let changed = 0;
  for (const entry of palette) {
    const newColor = matchDept(entry.department_group);
    if (newColor && entry.color !== newColor) {
      entry.color = newColor;
      changed++;
    }
  }
  if (changed) {
    fs.writeFileSync(fp, JSON.stringify(data, null, 2));
    console.log(`  ${f}: ${changed} dept colors updated`);
    totalUpdated += changed;
  }
}

// 2. Update parti_runtime.json
const partiPath = path.join(DATA_DIR, 'parti_runtime.json');
const parti = JSON.parse(fs.readFileSync(partiPath, 'utf8'));
let partiChanged = 0;

for (const [name, prog] of Object.entries(parti.programs || {})) {
  const palette = prog.department_palette;
  if (!palette) continue;
  for (const entry of palette) {
    const newColor = matchDept(entry.department_group);
    if (newColor && entry.color !== newColor) {
      entry.color = newColor;
      partiChanged++;
    }
  }
}

if (partiChanged) {
  fs.writeFileSync(partiPath, JSON.stringify(parti, null, 2));
  console.log(`  parti_runtime.json: ${partiChanged} dept colors updated`);
  totalUpdated += partiChanged;
}

console.log(`\nTotal: ${totalUpdated} department colors migrated to unified palette.`);
