import { useEffect, useRef, useState } from "react";
import { FloorPlan, PlanModel, Rect, SiteContext } from "../../models/types";
import {
  clampRectWithinBounds,
  getBoundingBox,
  rectToPolygon
} from "../../engine/geometry/polygon";
import { useCanvasViewport } from "../gestures/useCanvasViewport";
import { PlanOverlay } from "../overlays/PlanOverlay";

type ResizeHandle = "n" | "s" | "e" | "w";

type Interaction =
  | {
      mode: "move";
      roomId: string;
      originWorld: { x: number; y: number };
      originalRect: Rect;
      currentRect: Rect;
    }
  | {
      mode: "resize";
      roomId: string;
      handle: ResizeHandle;
      originWorld: { x: number; y: number };
      originalRect: Rect;
      currentRect: Rect;
    };

interface PlanCanvasProps {
  plan: PlanModel | null;
  site: SiteContext;
  selectedFloorId: string | null;
  selectedRoomId: string | null;
  onSelectFloor: (floorId: string) => void;
  onSelectRoom: (roomId: string | null) => void;
  onCommitRoomGeometry: (
    roomId: string,
    geometry: Rect,
    eventType: "move_room" | "resize_room"
  ) => void;
  onMoveRoomToFloor: (roomId: string, targetFloorId: string, geometry: Rect) => void;
  isStale: boolean;
}

function resizeRect(
  rect: Rect,
  handle: ResizeHandle,
  deltaX: number,
  deltaY: number
): Rect {
  const minimumSize = 8;

  if (handle === "e") {
    return {
      ...rect,
      width: Math.max(minimumSize, rect.width + deltaX)
    };
  }

  if (handle === "w") {
    const nextWidth = Math.max(minimumSize, rect.width - deltaX);
    return {
      ...rect,
      x: rect.x + (rect.width - nextWidth),
      width: nextWidth
    };
  }

  if (handle === "s") {
    return {
      ...rect,
      height: Math.max(minimumSize, rect.height + deltaY)
    };
  }

  const nextHeight = Math.max(minimumSize, rect.height - deltaY);
  return {
    ...rect,
    y: rect.y + (rect.height - nextHeight),
    height: nextHeight
  };
}

function pointInsideDomRect(
  clientX: number,
  clientY: number,
  element: HTMLElement | null
): boolean {
  if (!element) {
    return false;
  }

  const rect = element.getBoundingClientRect();

  return (
    clientX >= rect.left &&
    clientX <= rect.right &&
    clientY >= rect.top &&
    clientY <= rect.bottom
  );
}

export function PlanCanvas({
  plan,
  site,
  selectedFloorId,
  selectedRoomId,
  onSelectFloor,
  onSelectRoom,
  onCommitRoomGeometry,
  onMoveRoomToFloor,
  isStale
}: PlanCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const floorDropRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const activeFloor =
    plan?.floors.find((floor) => floor.id === selectedFloorId) ?? plan?.floors[0] ?? null;
  const selectedRoom =
    activeFloor?.rooms.find((room) => room.id === selectedRoomId) ??
    plan?.floors.flatMap((floor) => floor.rooms).find((room) => room.id === selectedRoomId) ??
    null;
  const bounds = activeFloor ? getBoundingBox(activeFloor.polygon) : null;
  const { pan, zoom, handleWheel, resetFit, screenToWorld, startPan, zoomIn, zoomOut } =
    useCanvasViewport(containerRef, bounds);
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const [dropFloorId, setDropFloorId] = useState<string | null>(null);

  useEffect(() => {
    if (!interaction || !bounds) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const world = screenToWorld(event.clientX, event.clientY);
      const deltaX = world.x - interaction.originWorld.x;
      const deltaY = world.y - interaction.originWorld.y;

      if (interaction.mode === "move") {
        const nextRect = clampRectWithinBounds(
          {
            ...interaction.originalRect,
            x: interaction.originalRect.x + deltaX,
            y: interaction.originalRect.y + deltaY
          },
          bounds
        );

        setInteraction({
          ...interaction,
          currentRect: nextRect
        });

        const nextDropFloor =
          plan?.floors.find((floor) =>
            pointInsideDomRect(event.clientX, event.clientY, floorDropRefs.current[floor.id])
          )?.id ?? null;

        setDropFloorId(nextDropFloor);
        return;
      }

      const resized = resizeRect(
        interaction.originalRect,
        interaction.handle,
        deltaX,
        deltaY
      );

      setInteraction({
        ...interaction,
        currentRect: clampRectWithinBounds(resized, bounds)
      });
    };

    const handlePointerUp = () => {
      if (interaction.mode === "move" && dropFloorId && dropFloorId !== activeFloor?.id) {
        onMoveRoomToFloor(interaction.roomId, dropFloorId, interaction.currentRect);
      } else if (
        interaction.currentRect.x !== interaction.originalRect.x ||
        interaction.currentRect.y !== interaction.originalRect.y ||
        interaction.currentRect.width !== interaction.originalRect.width ||
        interaction.currentRect.height !== interaction.originalRect.height
      ) {
        onCommitRoomGeometry(
          interaction.roomId,
          interaction.currentRect,
          interaction.mode === "move" ? "move_room" : "resize_room"
        );
      }

      setInteraction(null);
      setDropFloorId(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [
    activeFloor?.id,
    bounds,
    dropFloorId,
    interaction,
    onCommitRoomGeometry,
    onMoveRoomToFloor,
    plan?.floors,
    screenToWorld
  ]);

  if (!plan || !activeFloor) {
    return (
      <div className="panel canvas-panel">
        <div className="canvas-empty">
          <div>
            <div className="eyebrow">Canvas Editor</div>
            <h2 className="title">No plan available</h2>
            <p className="subtle">Generate a best guess to start editing rooms.</p>
          </div>
        </div>
      </div>
    );
  }

  const footprintPoints = activeFloor.polygon.map((point) => `${point.x},${point.y}`).join(" ");
  const contextBounds = activeFloor.polygon.concat(site.context.flatMap((item) => item.polygon));
  const fullBounds = getBoundingBox(contextBounds);
  const padding = 24;

  return (
    <div className="panel canvas-panel">
      <PlanOverlay
        floor={activeFloor}
        isStale={isStale}
        onFit={resetFit}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        plan={plan}
      />

      <div className="canvas-shell" ref={containerRef}>
        <div className="canvas-dock">
          {plan.floors.map((floor) => (
            <button
              className={[
                "floor-drop",
                floor.id === activeFloor.id ? "is-selected" : "",
                floor.id === dropFloorId ? "is-target" : ""
              ]
                .filter(Boolean)
                .join(" ")}
              key={floor.id}
              onClick={() => onSelectFloor(floor.id)}
              ref={(element) => {
                floorDropRefs.current[floor.id] = element;
              }}
              type="button"
            >
              <strong>{floor.label}</strong>
              <div className="subtle">{floor.rooms.length} rooms</div>
            </button>
          ))}
        </div>

        <svg
          aria-label="Plan canvas"
          onWheel={handleWheel}
          style={{ width: "100%", height: "100%", touchAction: "none" }}
          viewBox={`0 0 ${containerRef.current?.clientWidth ?? 1000} ${
            containerRef.current?.clientHeight ?? 800
          }`}
        >
          <rect
            fill="transparent"
            height="100%"
            onPointerDown={(event) => {
              onSelectRoom(null);
              startPan(event.clientX, event.clientY);
            }}
            width="100%"
            x={0}
            y={0}
          />
          <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
            <rect
              fill="rgba(255,255,255,0.32)"
              height={fullBounds.height + padding * 2}
              rx={6}
              stroke="rgba(36, 27, 18, 0.06)"
              strokeDasharray="2 4"
              width={fullBounds.width + padding * 2}
              x={fullBounds.x - padding}
              y={fullBounds.y - padding}
            />

            {site.context.map((item) => (
              <polygon
                fill={item.type === "noise" ? "rgba(181, 93, 36, 0.16)" : "rgba(82, 86, 110, 0.14)"}
                key={item.id}
                points={item.polygon.map((point) => `${point.x},${point.y}`).join(" ")}
                stroke="rgba(36, 27, 18, 0.18)"
                strokeDasharray="2 3"
                strokeWidth={0.6}
              />
            ))}

            <polygon
              fill="rgba(255,255,255,0.92)"
              points={footprintPoints}
              stroke="#241b12"
              strokeWidth={1.2}
            />

            <rect
              fill="rgba(136, 120, 102, 0.22)"
              height={activeFloor.corridor.height}
              rx={2}
              stroke="rgba(36, 27, 18, 0.18)"
              strokeWidth={0.5}
              width={activeFloor.corridor.width}
              x={activeFloor.corridor.x}
              y={activeFloor.corridor.y}
            />

            {site.anchors.map((anchor) =>
              anchor.type === "structure_line" && anchor.x2 !== undefined && anchor.y2 !== undefined ? (
                <line
                  key={anchor.id}
                  stroke="rgba(36, 27, 18, 0.35)"
                  strokeDasharray="2 4"
                  strokeWidth={0.7}
                  x1={anchor.x}
                  x2={anchor.x2}
                  y1={anchor.y}
                  y2={anchor.y2}
                />
              ) : (
                <rect
                  fill="rgba(45, 109, 110, 0.14)"
                  height={anchor.height ?? 10}
                  key={anchor.id}
                  rx={1.6}
                  stroke="rgba(45, 109, 110, 0.42)"
                  strokeWidth={0.5}
                  width={anchor.width ?? 10}
                  x={anchor.x}
                  y={anchor.y}
                />
              )
            )}

            {activeFloor.rooms.map((room) => {
              const ghostRect =
                interaction?.roomId === room.id ? interaction.currentRect : room.geometry;
              const isActive = room.id === selectedRoom?.id;
              const roomPolygon = rectToPolygon(ghostRect)
                .map((point) => `${point.x},${point.y}`)
                .join(" ");

              return (
                <g key={room.id}>
                  <polygon
                    fill={room.color}
                    fillOpacity={isActive ? 0.92 : 0.8}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      onSelectRoom(room.id);

                      const world = screenToWorld(event.clientX, event.clientY);
                      setInteraction({
                        mode: "move",
                        roomId: room.id,
                        originWorld: world,
                        originalRect: room.geometry,
                        currentRect: room.geometry
                      });
                    }}
                    points={roomPolygon}
                    stroke={isActive ? "#241b12" : "rgba(255,255,255,0.92)"}
                    strokeWidth={isActive ? 1.2 : 0.8}
                  />
                  <text
                    fill="#241b12"
                    fontFamily='"Avenir Next", sans-serif'
                    fontSize={Math.max(2.8, Math.min(4.6, ghostRect.height / 3))}
                    pointerEvents="none"
                    x={ghostRect.x + 1.6}
                    y={ghostRect.y + 4}
                  >
                    {room.name}
                  </text>
                  <text
                    fill="rgba(36,27,18,0.76)"
                    fontFamily='"SF Mono", monospace'
                    fontSize={2.5}
                    pointerEvents="none"
                    x={ghostRect.x + 1.6}
                    y={ghostRect.y + 7.4}
                  >
                    {Math.round(room.confidence.value * 100)}% conf
                  </text>
                </g>
              );
            })}

            {selectedRoom ? (
              <g>
                <rect
                  fill="none"
                  height={selectedRoom.geometry.height}
                  stroke="#241b12"
                  strokeDasharray="2 2"
                  strokeWidth={0.7}
                  width={selectedRoom.geometry.width}
                  x={selectedRoom.geometry.x}
                  y={selectedRoom.geometry.y}
                />
                {([
                  ["n", selectedRoom.geometry.x + selectedRoom.geometry.width / 2, selectedRoom.geometry.y],
                  ["s", selectedRoom.geometry.x + selectedRoom.geometry.width / 2, selectedRoom.geometry.y + selectedRoom.geometry.height],
                  ["e", selectedRoom.geometry.x + selectedRoom.geometry.width, selectedRoom.geometry.y + selectedRoom.geometry.height / 2],
                  ["w", selectedRoom.geometry.x, selectedRoom.geometry.y + selectedRoom.geometry.height / 2]
                ] as const).map(([handle, x, y]) => (
                  <circle
                    cx={x}
                    cy={y}
                    fill="#ffffff"
                    key={handle}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      const world = screenToWorld(event.clientX, event.clientY);
                      setInteraction({
                        mode: "resize",
                        roomId: selectedRoom.id,
                        handle,
                        originWorld: world,
                        originalRect: selectedRoom.geometry,
                        currentRect: selectedRoom.geometry
                      });
                    }}
                    r={1.3}
                    stroke="#241b12"
                    strokeWidth={0.5}
                  />
                ))}
              </g>
            ) : null}
          </g>
        </svg>
      </div>
    </div>
  );
}
