import { useRef, useCallback, useEffect } from "react";

interface VirtualJoystickProps {
  /** Called when joystick position changes. dx/dy are pixel-per-tick values. */
  onChange: (dx: number, dy: number) => void;
  /** Max pixels per tick at full deflection (default 5) */
  speed: number;
  /** Disable interaction */
  disabled?: boolean;
  /** Radius of the outer track in px */
  size?: number;
}

const DEADZONE = 0.1;

export function VirtualJoystick({
  onChange,
  speed,
  disabled = false,
  size = 56,
}: VirtualJoystickProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const radius = size / 2;
  const thumbSize = size * 0.4;

  const updatePosition = useCallback(
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

      // Update thumb visual
      if (thumbRef.current) {
        thumbRef.current.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
      }

      // Normalize to -1..+1
      const nx = offsetX / radius;
      const ny = offsetY / radius;
      const mag = Math.min(dist / radius, 1);

      if (mag < DEADZONE) {
        onChangeRef.current(0, 0);
      } else {
        const dx = Math.round(nx * mag * speed);
        const dy = Math.round(ny * mag * speed);
        onChangeRef.current(dx, dy);
      }
    },
    [radius, speed],
  );

  const resetPosition = useCallback(() => {
    if (thumbRef.current) {
      thumbRef.current.style.transform = "translate(0px, 0px)";
    }
    onChangeRef.current(0, 0);
  }, []);

  // Global pointer events for dragging outside the element
  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      e.preventDefault();
      updatePosition(e.clientX, e.clientY);
    };

    const handleUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      resetPosition();
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [updatePosition, resetPosition]);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <p className="text-[10px] text-muted-foreground">Drag Direction</p>
      <div
        ref={containerRef}
        className="relative flex items-center justify-center rounded-full border border-border bg-muted/30 select-none touch-none"
        style={{ width: size, height: size }}
        onPointerDown={(e) => {
          if (disabled) return;
          e.preventDefault();
          dragging.current = true;
          updatePosition(e.clientX, e.clientY);
        }}
      >
        {/* Crosshair lines */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="absolute w-px h-full bg-border/40" />
          <div className="absolute h-px w-full bg-border/40" />
        </div>
        {/* Direction labels */}
        <span className="absolute top-0.5 text-[7px] text-muted-foreground/50 pointer-events-none">N</span>
        <span className="absolute bottom-0.5 text-[7px] text-muted-foreground/50 pointer-events-none">S</span>
        <span className="absolute left-1 text-[7px] text-muted-foreground/50 pointer-events-none">W</span>
        <span className="absolute right-1 text-[7px] text-muted-foreground/50 pointer-events-none">E</span>
        {/* Thumb */}
        <div
          ref={thumbRef}
          className={`rounded-full border border-border transition-none ${
            disabled
              ? "bg-muted-foreground/20"
              : "bg-primary/80 cursor-grab active:cursor-grabbing"
          }`}
          style={{
            width: thumbSize,
            height: thumbSize,
            transform: "translate(0px, 0px)",
          }}
        />
      </div>
    </div>
  );
}
