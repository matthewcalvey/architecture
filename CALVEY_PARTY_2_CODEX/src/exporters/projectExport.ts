import { FloorPlan, PartyProject, SiteContext } from "../models/types";

export function serializeProject(project: PartyProject): string {
  return JSON.stringify(project, null, 2);
}

function polygonToPath(site: SiteContext): string {
  return site.footprint
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ")
    .concat(" Z");
}

export function buildFloorSvg(floor: FloorPlan, site: SiteContext): string {
  const footprintPath = polygonToPath(site);
  const rooms = floor.rooms
    .map(
      (room) => `
      <g>
        <rect x="${room.geometry.x}" y="${room.geometry.y}" width="${room.geometry.width}" height="${room.geometry.height}" rx="1.5" fill="${room.color}" fill-opacity="0.84" stroke="#ffffff" stroke-width="0.6" />
        <text x="${room.geometry.x + 1.8}" y="${room.geometry.y + 4}" font-family="Avenir Next, sans-serif" font-size="3.2" fill="#241b12">${room.name}</text>
      </g>`
    )
    .join("");

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="-12 -12 140 100">
      <rect x="-12" y="-12" width="140" height="100" fill="#f7f1e6" />
      <path d="${footprintPath}" fill="#ffffff" stroke="#241b12" stroke-width="1.2" />
      <rect x="${floor.corridor.x}" y="${floor.corridor.y}" width="${floor.corridor.width}" height="${floor.corridor.height}" fill="#d8d0c2" />
      ${rooms}
    </svg>
  `.trim();
}

export function downloadTextFile(filename: string, contents: string, mime: string): void {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
}
