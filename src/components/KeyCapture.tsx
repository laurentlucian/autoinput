import { useState, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Normalize a KeyboardEvent into a display-friendly key name.
 * Maps modifiers and special keys to consistent labels.
 */
function normalizeKey(e: React.KeyboardEvent): string {
  const key = e.key;

  // Map common special keys to cleaner labels
  switch (key) {
    case " ": return "Space";
    case "ArrowUp": return "Up";
    case "ArrowDown": return "Down";
    case "ArrowLeft": return "Left";
    case "ArrowRight": return "Right";
    case "Control": return "Ctrl";
    case "Meta": return "Cmd";
    case "Escape": return "Esc";
    default:
      // F-keys, single characters, etc. — capitalize single letters
      if (key.length === 1) return key.toUpperCase();
      return key;
  }
}

interface KeyCaptureProps {
  value: string;
  onChange: (key: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export function KeyCapture({
  value,
  onChange,
  disabled,
  className,
  placeholder = "Press a key",
}: KeyCaptureProps) {
  const [listening, setListening] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
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
        className,
      )}
      onFocus={() => setListening(true)}
      onBlur={() => setListening(false)}
      onKeyDown={(e) => {
        if (!listening) return;

        // Ignore Tab so the user can still navigate away
        if (e.key === "Tab") return;

        e.preventDefault();
        e.stopPropagation();

        const key = normalizeKey(e);
        onChange(key);
        setListening(false);
        buttonRef.current?.blur();
      }}
    >
      {listening ? (
        <span className="text-muted-foreground animate-pulse">{placeholder}</span>
      ) : (
        <span>{value}</span>
      )}
    </button>
  );
}
