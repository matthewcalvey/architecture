import { RefObject, useEffect, useRef, useState } from "react";
import { Rect } from "../../models/types";
import { clamp } from "../../utils/math";

interface PanGesture {
  originClientX: number;
  originClientY: number;
  startX: number;
  startY: number;
}

export function useCanvasViewport(
  containerRef: RefObject<HTMLDivElement>,
  bounds: Rect | null
) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const [panGesture, setPanGesture] = useState<PanGesture | null>(null);
  const hasFitRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;

    if (!container || !bounds || hasFitRef.current) {
      return;
    }

    const fit = () => {
      const rect = container.getBoundingClientRect();
      const zoomValue = Math.min(
        rect.width / Math.max(1, bounds.width * 1.25),
        rect.height / Math.max(1, bounds.height * 1.25)
      );
      const panX = rect.width / 2 - (bounds.x + bounds.width / 2) * zoomValue;
      const panY = rect.height / 2 - (bounds.y + bounds.height / 2) * zoomValue;

      setZoom(zoomValue);
      setPan({ x: panX, y: panY });
      setReady(true);
      hasFitRef.current = true;
    };

    fit();

    const observer = new ResizeObserver(() => {
      hasFitRef.current = false;
      fit();
    });

    observer.observe(container);

    return () => observer.disconnect();
  }, [bounds, containerRef]);

  useEffect(() => {
    if (!panGesture) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      setPan({
        x: panGesture.startX + (event.clientX - panGesture.originClientX),
        y: panGesture.startY + (event.clientY - panGesture.originClientY)
      });
    };

    const handlePointerUp = () => {
      setPanGesture(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [panGesture]);

  function screenToWorld(clientX: number, clientY: number) {
    const container = containerRef.current;

    if (!container) {
      return {
        x: 0,
        y: 0
      };
    }

    const rect = container.getBoundingClientRect();
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom
    };
  }

  function startPan(clientX: number, clientY: number) {
    setPanGesture({
      originClientX: clientX,
      originClientY: clientY,
      startX: pan.x,
      startY: pan.y
    });
  }

  function handleWheel(event: React.WheelEvent) {
    event.preventDefault();

    const container = containerRef.current;

    if (!container) {
      return;
    }

    const rect = container.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    const worldX = (pointerX - pan.x) / zoom;
    const worldY = (pointerY - pan.y) / zoom;
    const nextZoom = clamp(zoom * (event.deltaY > 0 ? 0.92 : 1.08), 0.4, 4);

    setZoom(nextZoom);
    setPan({
      x: pointerX - worldX * nextZoom,
      y: pointerY - worldY * nextZoom
    });
  }

  function zoomBy(step: number) {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const rect = container.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const worldX = (centerX - pan.x) / zoom;
    const worldY = (centerY - pan.y) / zoom;
    const nextZoom = clamp(zoom + step, 0.4, 4);

    setZoom(nextZoom);
    setPan({
      x: centerX - worldX * nextZoom,
      y: centerY - worldY * nextZoom
    });
  }

  function resetFit() {
    hasFitRef.current = false;

    if (bounds) {
      const container = containerRef.current;

      if (!container) {
        return;
      }

      const rect = container.getBoundingClientRect();
      const nextZoom = Math.min(
        rect.width / Math.max(1, bounds.width * 1.25),
        rect.height / Math.max(1, bounds.height * 1.25)
      );
      setZoom(nextZoom);
      setPan({
        x: rect.width / 2 - (bounds.x + bounds.width / 2) * nextZoom,
        y: rect.height / 2 - (bounds.y + bounds.height / 2) * nextZoom
      });
      hasFitRef.current = true;
    }
  }

  return {
    zoom,
    pan,
    ready,
    screenToWorld,
    startPan,
    handleWheel,
    zoomIn: () => zoomBy(0.15),
    zoomOut: () => zoomBy(-0.15),
    resetFit
  };
}
