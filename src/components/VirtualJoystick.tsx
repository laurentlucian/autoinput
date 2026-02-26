import { useRef, useCallback, useEffect } from "react";

interface DirectionPickerProps {
  /** Normalized direction X: -1..+1 */
  directionX: number;
  /** Normalized direction Y: -1..+1 */
  directionY: number;
  /** Called when direction changes (persisted values, -1..+1) */
  onChange: (dx: number, dy: number) => void;
  /** Disable interaction */
  disabled?: boolean;
  /** Radius of the outer track in px */
  size?: number;
}

const DEADZONE = 0.1;

export function DirectionPicker({
  directionX,
  directionY,
  onChange,
  disabled = false,
  size = 72,
}: DirectionPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const radius = size / 2;
  const thumbSize = size * 0.4;

  // Position the thumb based on the persisted direction
  const thumbX = directionX * radius;
  const thumbY = directionY * radius;

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const el = containerRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      let offsetX = clientX - centerX;
      let offsetY = clientY - centerY;

      // Clamp to circle
      const dist = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
      if (dist > radius) {
        offsetX = (offsetX / dist) * radius;
        offsetY = (offsetY / dist) * radius;
      }

      // Normalize to -1..+1
      const nx = offsetX / radius;
      const ny = offsetY / radius;
      const mag = Math.min(dist / radius, 1);

      if (mag < DEADZONE) {
        onChangeRef.current(0, 0);
      } else {
        // Persist the normalized direction (rounded to 2 decimals for clean storage)
        onChangeRef.current(
          Math.round(nx * 100) / 100,
          Math.round(ny * 100) / 100,
        );
      }
    },
    [radius],
  );

  // Global pointer events for dragging outside the element
  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      e.preventDefault();
      updateFromPointer(e.clientX, e.clientY);
    };

    const handleUp = () => {
      dragging.current = false;
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [updateFromPointer]);

  // Derive a human-readable label for the current direction
  const dirLabel = getDirectionLabel(directionX, directionY);

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">Drag Direction</p>
      <div
        ref={containerRef}
        className="relative flex items-center justify-center rounded-full border-2 border-border bg-muted/30 select-none touch-none"
        style={{ width: size, height: size }}
        onPointerDown={(e) => {
          if (disabled) return;
          e.preventDefault();
          dragging.current = true;
          updateFromPointer(e.clientX, e.clientY);
        }}
      >
        {/* Crosshair lines */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="absolute w-px h-full bg-border/40" />
          <div className="absolute h-px w-full bg-border/40" />
        </div>
        {/* Direction labels */}
        <span className="absolute top-0.5 text-[9px] text-muted-foreground/50 pointer-events-none font-medium">N</span>
        <span className="absolute bottom-0.5 text-[9px] text-muted-foreground/50 pointer-events-none font-medium">S</span>
        <span className="absolute left-1.5 text-[9px] text-muted-foreground/50 pointer-events-none font-medium">W</span>
        <span className="absolute right-1.5 text-[9px] text-muted-foreground/50 pointer-events-none font-medium">E</span>
        {/* Thumb -- positioned from persisted state */}
        <div
          ref={thumbRef}
          className={`rounded-full border-2 border-border ${
            disabled
              ? "bg-muted-foreground/20"
              : "bg-primary/80 cursor-grab active:cursor-grabbing"
          }`}
          style={{
            width: thumbSize,
            height: thumbSize,
            transform: `translate(${thumbX}px, ${thumbY}px)`,
            transition: dragging.current ? "none" : "transform 150ms ease",
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground/60 tabular-nums font-medium">{dirLabel}</p>
    </div>
  );
}

function getDirectionLabel(x: number, y: number): string {
  if (x === 0 && y === 0) return "None";
  const angle = Math.atan2(-y, x) * (180 / Math.PI); // -y because screen Y is inverted
  // Normalize to 0..360
  const a = ((angle % 360) + 360) % 360;
  if (a >= 337.5 || a < 22.5) return "East";
  if (a >= 22.5 && a < 67.5) return "NE";
  if (a >= 67.5 && a < 112.5) return "North";
  if (a >= 112.5 && a < 157.5) return "NW";
  if (a >= 157.5 && a < 202.5) return "West";
  if (a >= 202.5 && a < 247.5) return "SW";
  if (a >= 247.5 && a < 292.5) return "South";
  return "SE";
}
