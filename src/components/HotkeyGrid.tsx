import { KeyCapture } from "@/components/KeyCapture";
import type { HotkeySet } from "@/types/settings";

const OPERATIONS = ["start", "stop", "toggle"] as const;

interface HotkeyGridProps {
  value: HotkeySet;
  onChange: (v: HotkeySet) => void;
  label?: string;
  disabled?: boolean;
}

export function HotkeyGrid({ value, onChange, label, disabled }: HotkeyGridProps) {
  return (
    <div className="space-y-3">
      {label ? <p className="text-sm uppercase tracking-widest text-muted-foreground font-bold">{label}</p> : null}
      <div className="grid grid-cols-3 gap-3">
        {OPERATIONS.map((op) => (
          <div key={op} className="space-y-1">
            <p className="text-xs text-muted-foreground text-center uppercase tracking-widest font-medium">{op}</p>
            <KeyCapture
              value={value[op]}
              disabled={disabled}
              clearable
              onChange={(v) => onChange({ ...value, [op]: v })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
