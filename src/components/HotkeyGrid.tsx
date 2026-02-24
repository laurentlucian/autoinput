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
    <div className="space-y-2">
      {label ? <p className="text-[10px] text-muted-foreground">{label}</p> : null}
      <div className="grid grid-cols-3 gap-2">
        {OPERATIONS.map((op) => (
          <div key={op} className="space-y-1">
            <p className="text-[10px] text-muted-foreground text-center uppercase">{op}</p>
            <KeyCapture
              value={value[op]}
              disabled={disabled}
              onChange={(v) => onChange({ ...value, [op]: v })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
