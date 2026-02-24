import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { HotkeyGrid } from "@/components/HotkeyGrid";
import { KeyCapture } from "@/components/KeyCapture";
import { usePersistedSettings } from "@/hooks/use-persisted-settings";
import { useActionControl } from "@/hooks/use-action-control";
import { useHotkeys } from "@/hooks/use-hotkeys";
import type { MouseButton, ClickType, KeyMode, Settings } from "@/types/settings";

// ---------------------------------------------------------------------------
// Hoisted constants (rendering-hoist-jsx)
// ---------------------------------------------------------------------------

const INTERVAL_FIELDS = [
  { label: "HR", key: "hours" as const },
  { label: "MIN", key: "minutes" as const },
  { label: "SEC", key: "seconds" as const },
  { label: "MS", key: "milliseconds" as const },
];

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const labelClass = "text-[11px] uppercase tracking-wider text-muted-foreground font-medium";
const sectionClass = "border border-border p-3 space-y-2";
const numberInputClass =
  "text-center h-8 text-sm [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

function App() {
  const { settings, set } = usePersistedSettings();
  const actions = useActionControl(settings);
  const { running, runningMode, error } = actions;

  useHotkeys(settings, actions);

  // Always-on-top window management
  useEffect(() => {
    invoke("set_always_on_top", { enabled: settings.alwaysOnTop }).catch(() => {});
  }, [settings.alwaysOnTop]);

  // Derived state — simple primitives, no useMemo needed (rerender-simple-expression-in-memo)
  const isShared = settings.hotkeyLayout === "shared";
  const isClickActive = settings.activeMode === "click";
  const isClickRunning = running && runningMode === "click";
  const isKeyHoldRunning = running && runningMode === "hold-key";

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-[440px] space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold tracking-tight">AUTOINPUT</h1>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={settings.alwaysOnTop}
                onChange={(e) => set("alwaysOnTop", e.target.checked)}
                className="accent-primary"
              />
              PIN
            </label>
            <span className={`text-xs font-mono ${running ? "text-destructive" : "text-muted-foreground"}`}>
              {running ? `RUNNING \u00b7 ${runningMode === "click" ? "CLICK" : "KEY"}` : "IDLE"}
            </span>
          </div>
        </div>

        {/* Error banner — ternary, not && (rendering-conditional-render) */}
        {error ? (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive text-xs p-2">
            {error}
          </div>
        ) : null}

        {/* Hotkey Layout */}
        <section className={sectionClass}>
          <p className={labelClass}>Hotkey Layout</p>
          <div className="flex gap-2">
            <Button
              variant={isShared ? "default" : "outline"}
              size="sm"
              className="flex-1"
              disabled={running}
              onClick={() => set("hotkeyLayout", "shared")}
            >
              Shared
            </Button>
            <Button
              variant={isShared ? "outline" : "default"}
              size="sm"
              className="flex-1"
              disabled={running}
              onClick={() => set("hotkeyLayout", "independent")}
            >
              Independent
            </Button>
          </div>
        </section>

        {/* Active Mode Toggle — only in shared mode */}
        {isShared ? (
          <section className={sectionClass}>
            <p className={labelClass}>Active Mode</p>
            <div className="flex gap-2">
              <Button
                variant={isClickActive ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => set("activeMode", "click")}
              >
                Mouse Click
              </Button>
              <Button
                variant={isClickActive ? "outline" : "default"}
                size="sm"
                className="flex-1"
                onClick={() => set("activeMode", "hold-key")}
              >
                Key Hold
              </Button>
            </div>
          </section>
        ) : null}

        {/* Interval */}
        <section className={sectionClass}>
          <p className={labelClass}>Interval</p>
          <div className="grid grid-cols-4 gap-2">
            {INTERVAL_FIELDS.map((item) => (
              <div key={item.label} className="space-y-1">
                <p className="text-[10px] text-muted-foreground text-center">{item.label}</p>
                <Input
                  type="number"
                  min="0"
                  value={settings[item.key]}
                  disabled={running}
                  onChange={(e) => set(item.key, Math.max(0, parseInt(e.target.value) || 0))}
                  className={numberInputClass}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Mouse Click */}
        <MouseClickSection
          settings={settings}
          set={set}
          disabled={running}
          isShared={isShared}
          isClickActive={isClickActive}
          isClickRunning={isClickRunning}
        />

        {/* Key Hold */}
        <KeyHoldSection
          settings={settings}
          set={set}
          disabled={running}
          isShared={isShared}
          isClickActive={isClickActive}
          isKeyHoldRunning={isKeyHoldRunning}
        />

        {/* Repeat */}
        <section className={sectionClass}>
          <p className={labelClass}>Repeat</p>
          <div className="flex gap-2 items-end">
            <div className="flex gap-2 flex-1">
              <Button
                variant={settings.repeatMode === "infinite" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                disabled={running}
                onClick={() => set("repeatMode", "infinite")}
              >
                Infinite
              </Button>
              <Button
                variant={settings.repeatMode === "count" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                disabled={running}
                onClick={() => set("repeatMode", "count")}
              >
                Count
              </Button>
            </div>
            {settings.repeatMode === "count" ? (
              <Input
                type="number"
                min="1"
                value={settings.repeatCount}
                disabled={running}
                onChange={(e) => set("repeatCount", Math.max(1, parseInt(e.target.value) || 1))}
                className={`w-20 ${numberInputClass}`}
              />
            ) : null}
          </div>
        </section>

        {/* Shared Hotkeys — only in shared mode */}
        {isShared ? (
          <section className={sectionClass}>
            <HotkeyGrid
              value={settings.hotkeys}
              onChange={(v) => set("hotkeys", v)}
              disabled={running}
            />
          </section>
        ) : null}

        {/* Action buttons */}
        {isShared ? (
          <div className="grid grid-cols-3 gap-2 pt-1">
            <Button onClick={() => actions.startAction()} disabled={running} size="sm">
              START{settings.hotkeys.start ? ` (${settings.hotkeys.start})` : ""}
            </Button>
            <Button onClick={() => actions.stopAction()} disabled={!running} variant="destructive" size="sm">
              STOP{settings.hotkeys.stop ? ` (${settings.hotkeys.stop})` : ""}
            </Button>
            <Button onClick={() => actions.toggleAction()} variant="outline" size="sm">
              TOGGLE{settings.hotkeys.toggle ? ` (${settings.hotkeys.toggle})` : ""}
            </Button>
          </div>
        ) : (
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-3 gap-2">
              <Button onClick={() => actions.startMode("click")} disabled={isClickRunning} size="sm">
                CLICK{settings.clickHotkeys.start ? ` (${settings.clickHotkeys.start})` : ""}
              </Button>
              <Button
                onClick={() => { if (isClickRunning) actions.stopCurrent(); }}
                disabled={!isClickRunning}
                variant="destructive"
                size="sm"
              >
                STOP{settings.clickHotkeys.stop ? ` (${settings.clickHotkeys.stop})` : ""}
              </Button>
              <Button onClick={() => actions.toggleMode("click")} variant="outline" size="sm">
                TOGGLE{settings.clickHotkeys.toggle ? ` (${settings.clickHotkeys.toggle})` : ""}
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button onClick={() => actions.startMode("hold-key")} disabled={isKeyHoldRunning} size="sm">
                KEY{settings.keyHoldHotkeys.start ? ` (${settings.keyHoldHotkeys.start})` : ""}
              </Button>
              <Button
                onClick={() => { if (isKeyHoldRunning) actions.stopCurrent(); }}
                disabled={!isKeyHoldRunning}
                variant="destructive"
                size="sm"
              >
                STOP{settings.keyHoldHotkeys.stop ? ` (${settings.keyHoldHotkeys.stop})` : ""}
              </Button>
              <Button onClick={() => actions.toggleMode("hold-key")} variant="outline" size="sm">
                TOGGLE{settings.keyHoldHotkeys.toggle ? ` (${settings.keyHoldHotkeys.toggle})` : ""}
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Section Components
// ---------------------------------------------------------------------------

function MouseClickSection({
  settings,
  set,
  disabled,
  isShared,
  isClickActive,
  isClickRunning,
}: {
  settings: Settings;
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  disabled: boolean;
  isShared: boolean;
  isClickActive: boolean;
  isClickRunning: boolean;
}) {
  const borderClass = isClickRunning
    ? "border-destructive/50"
    : (isShared && isClickActive) || !isShared
      ? "border-primary/50"
      : "opacity-60";

  return (
    <section className={`${sectionClass} ${borderClass}`}>
      <div className="flex items-center justify-between">
        <p className={labelClass}>Mouse Click</p>
        {isClickRunning ? (
          <span className="text-[10px] uppercase tracking-wider text-destructive font-medium">Running</span>
        ) : !isClickRunning && isShared && isClickActive ? (
          <span className="text-[10px] uppercase tracking-wider text-primary font-medium">Active</span>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground">Button</p>
          <Select
            value={settings.mouseButton}
            disabled={disabled}
            onValueChange={(v) => set("mouseButton", v as MouseButton)}
          >
            <SelectTrigger className="h-8 w-full text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="right">Right</SelectItem>
              <SelectItem value="middle">Middle</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground">Type</p>
          <Select
            value={settings.clickType}
            disabled={disabled}
            onValueChange={(v) => set("clickType", v as ClickType)}
          >
            <SelectTrigger className="h-8 w-full text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single">Single</SelectItem>
              <SelectItem value="double">Double</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cursor Position */}
      <div className="space-y-2 pt-1">
        <p className="text-[10px] text-muted-foreground">Cursor Position</p>
        <div className="flex gap-2 items-end">
          <div className="flex gap-2 flex-1">
            <Button
              variant={settings.locationMode === "current" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              disabled={disabled}
              onClick={() => set("locationMode", "current")}
            >
              Current
            </Button>
            <Button
              variant={settings.locationMode === "fixed" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              disabled={disabled}
              onClick={() => set("locationMode", "fixed")}
            >
              Fixed
            </Button>
          </div>
          {settings.locationMode === "fixed" ? (
            <div className="flex gap-1">
              <div className="space-y-0.5">
                <p className="text-[10px] text-muted-foreground text-center">X</p>
                <Input
                  type="number"
                  value={settings.fixedX}
                  disabled={disabled}
                  onChange={(e) => set("fixedX", parseInt(e.target.value) || 0)}
                  className={`w-16 ${numberInputClass}`}
                />
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] text-muted-foreground text-center">Y</p>
                <Input
                  type="number"
                  value={settings.fixedY}
                  disabled={disabled}
                  onChange={(e) => set("fixedY", parseInt(e.target.value) || 0)}
                  className={`w-16 ${numberInputClass}`}
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Independent hotkeys for click */}
      {!isShared ? (
        <HotkeyGrid
          label="Hotkeys"
          value={settings.clickHotkeys}
          onChange={(v) => set("clickHotkeys", v)}
          disabled={disabled}
        />
      ) : null}
    </section>
  );
}

function KeyHoldSection({
  settings,
  set,
  disabled,
  isShared,
  isClickActive,
  isKeyHoldRunning,
}: {
  settings: Settings;
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  disabled: boolean;
  isShared: boolean;
  isClickActive: boolean;
  isKeyHoldRunning: boolean;
}) {
  const borderClass = isKeyHoldRunning
    ? "border-destructive/50"
    : (isShared && !isClickActive) || !isShared
      ? "border-primary/50"
      : "opacity-60";

  return (
    <section className={`${sectionClass} ${borderClass}`}>
      <div className="flex items-center justify-between">
        <p className={labelClass}>Key Hold</p>
        {isKeyHoldRunning ? (
          <span className="text-[10px] uppercase tracking-wider text-destructive font-medium">Running</span>
        ) : !isKeyHoldRunning && isShared && !isClickActive ? (
          <span className="text-[10px] uppercase tracking-wider text-primary font-medium">Active</span>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground">Key</p>
          <KeyCapture
            value={settings.holdKey}
            disabled={disabled}
            onChange={(v) => { if (v) set("holdKey", v); }}
          />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground">Mode</p>
          <Select
            value={settings.keyMode}
            disabled={disabled}
            onValueChange={(v) => set("keyMode", v as KeyMode)}
          >
            <SelectTrigger className="h-8 w-full text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hold">Hold (continuous)</SelectItem>
              <SelectItem value="repeat">Repeat (tap)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Independent hotkeys for key hold */}
      {!isShared ? (
        <HotkeyGrid
          label="Hotkeys"
          value={settings.keyHoldHotkeys}
          onChange={(v) => set("keyHoldHotkeys", v)}
          disabled={disabled}
        />
      ) : null}
    </section>
  );
}

export default App;
