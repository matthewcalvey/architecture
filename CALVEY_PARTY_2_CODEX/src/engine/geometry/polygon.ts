import { Point, Rect } from "../../models/types";
import { clamp } from "../../utils/math";

export function getBoundingBox(points: Point[]): Rect {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

export function polygonArea(points: Point[]): number {
  let area = 0;

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    area += current.x * next.y - next.x * current.y;
  }

  return Math.abs(area / 2);
}

export function rectArea(rect: Rect): number {
  return rect.width * rect.height;
}

export function rectCenter(rect: Rect): Point {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2
  };
}

export function rectAspectRatio(rect: Rect): number {
  return rect.width >= rect.height ? rect.width / rect.height : rect.height / rect.width;
}

export function rectGap(rectA: Rect, rectB: Rect): number {
  const dx = Math.max(
    rectA.x - (rectB.x + rectB.width),
    rectB.x - (rectA.x + rectA.width),
    0
  );
  const dy = Math.max(
    rectA.y - (rectB.y + rectB.height),
    rectB.y - (rectA.y + rectA.height),
    0
  );

  return Math.sqrt(dx * dx + dy * dy);
}

export function rectOverlapRatio(rectA: Rect, rectB: Rect): number {
  const overlapWidth = Math.max(
    0,
    Math.min(rectA.x + rectA.width, rectB.x + rectB.width) -
      Math.max(rectA.x, rectB.x)
  );
  const overlapHeight = Math.max(
    0,
    Math.min(rectA.y + rectA.height, rectB.y + rectB.height) -
      Math.max(rectA.y, rectB.y)
  );
  const overlapArea = overlapWidth * overlapHeight;
  const smallerArea = Math.max(1, Math.min(rectArea(rectA), rectArea(rectB)));

  return overlapArea / smallerArea;
}

export function clampRectWithinBounds(rect: Rect, bounds: Rect): Rect {
  return {
    x: clamp(rect.x, bounds.x, bounds.x + bounds.width - rect.width),
    y: clamp(rect.y, bounds.y, bounds.y + bounds.height - rect.height),
    width: clamp(rect.width, 4, bounds.width),
    height: clamp(rect.height, 4, bounds.height)
  };
}

export function rectToPolygon(rect: Rect): Point[] {
  return [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height }
  ];
}
