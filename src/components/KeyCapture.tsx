import { useState, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Normalize a KeyboardEvent into a display-friendly key name.
 */
function normalizeKey(e: React.KeyboardEvent): string {
  const key = e.key;

  switch (key) {
    case " ": return "Space";
    case "ArrowUp": return "Up";
    case "ArrowDown": return "Down";
    case "ArrowLeft": return "Left";
    case "ArrowRight": return "Right";
    case "Control": return "Ctrl";
    case "Meta": return "Cmd";
    default:
      if (key.length === 1) return key.toUpperCase();
      return key;
  }
}

interface KeyCaptureProps {
  value: string | null;
  onChange: (key: string | null) => void;
  disabled?: boolean;
  /** Allow the user to clear the binding (Escape while listening, or click x). */
  clearable?: boolean;
  className?: string;
  placeholder?: string;
}

export function KeyCapture({
  value,
  onChange,
  disabled,
  clearable,
  className,
  placeholder = "Press a key",
}: KeyCaptureProps) {
  const [listening, setListening] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const isEmpty = value === null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        className={cn(
          "h-8 w-full rounded-md border bg-background px-2 text-sm text-center",
          "outline-none transition-all",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "disabled:pointer-events-none disabled:opacity-50",
          listening && "border-primary ring-primary/30 ring-[3px]",
          isEmpty && !listening && "text-muted-foreground",
          className,
        )}
        onFocus={() => setListening(true)}
        onBlur={() => setListening(false)}
        onKeyDown={(e) => {
          if (!listening) return;

          // Tab: let the user navigate away
          if (e.key === "Tab") return;

          e.preventDefault();
          e.stopPropagation();

          // Escape clears the binding when clearable
          if (e.key === "Escape") {
            if (clearable) onChange(null);
            setListening(false);
            buttonRef.current?.blur();
            return;
          }

          // Backspace/Delete also clears when clearable
          if (clearable && (e.key === "Backspace" || e.key === "Delete")) {
            onChange(null);
            setListening(false);
            buttonRef.current?.blur();
            return;
          }

          onChange(normalizeKey(e));
          setListening(false);
          buttonRef.current?.blur();
        }}
      >
        {listening ? (
          <span className="text-muted-foreground animate-pulse">{placeholder}</span>
        ) : isEmpty ? (
          <span className="text-[11px]">Off</span>
        ) : (
          <span>{value}</span>
        )}
      </button>

      {/* Clear button — shown when there's a value and clearable is enabled */}
      {clearable && !isEmpty && !disabled ? (
        <button
          type="button"
          tabIndex={-1}
          className={cn(
            "absolute -top-1.5 -right-1.5 flex items-center justify-center",
            "size-4 rounded-full",
            "bg-muted text-muted-foreground",
            "hover:bg-destructive hover:text-white",
            "transition-colors text-[10px] leading-none",
          )}
          onMouseDown={(e) => {
            // Prevent the parent button from getting focus
            e.preventDefault();
            e.stopPropagation();
            onChange(null);
          }}
          aria-label="Clear hotkey"
        >
          &times;
        </button>
      ) : null}
    </div>
  );
}
