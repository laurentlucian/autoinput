import type { InputConfig } from "@/types/settings";

interface CompactDotProps {
  config: InputConfig | undefined;
}

export function CompactDot({ config }: CompactDotProps) {
  const stopKey = config?.hotkeys.stop || config?.hotkeys.toggle || null;
  const tooltipText = config
    ? `${config.name}${stopKey ? ` — ${stopKey} to stop` : ""}`
    : "Running";

  return (
    <div
      className="h-screen w-screen flex items-center justify-center bg-transparent"
      data-tauri-drag-region
    >
      <div
        className="w-12 h-12 rounded-full bg-destructive compact-dot-pulse"
        title={tooltipText}
        data-tauri-drag-region
      />
    </div>
  );
}
