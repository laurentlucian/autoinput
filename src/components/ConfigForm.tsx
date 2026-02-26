import { useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Mouse, Keyboard } from "lucide-react";
import { VirtualJoystick } from "@/components/VirtualJoystick";
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
import type { InputConfig, MouseButton, MouseMode, KeyMode } from "@/types/settings";

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const labelClass = "text-[11px] uppercase tracking-wider text-muted-foreground font-medium";
const sublabelClass = "text-[10px] text-muted-foreground leading-tight";
const sectionClass = "border border-border p-3 space-y-2 transition-all duration-150";
const numberInputClass =
  "text-center h-8 text-sm [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

const INTERVAL_FIELDS = [
  { label: "HR", key: "hours" as const },
  { label: "MIN", key: "minutes" as const },
  { label: "SEC", key: "seconds" as const },
  { label: "MS", key: "milliseconds" as const },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function totalIntervalMs(c: InputConfig): number {
  return c.milliseconds + c.seconds * 1000 + c.minutes * 60_000 + c.hours * 3_600_000;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ConfigFormProps {
  config: InputConfig;
  onChange: (patch: Partial<InputConfig>) => void;
  /** Disable all inputs (e.g. while running) */
  disabled?: boolean;
  /** Whether this config is currently running (for joystick etc.) */
  isRunning?: boolean;
}

export function ConfigForm({ config, onChange, disabled = false, isRunning = false }: ConfigFormProps) {
  const isClick = config.actionType === "click";
  const needsInterval = isClick
    ? config.mouseMode === "click"
    : config.keyMode === "repeat";
  const intervalIsZero = totalIntervalMs(config) === 0;

  // Throttled drag vector update
  const lastSent = useRef(0);
  const handleJoystick = useCallback((dx: number, dy: number) => {
    const now = Date.now();
    if (now - lastSent.current < 16) return;
    lastSent.current = now;
    invoke("update_drag_vector", { dx, dy }).catch(() => {});
  }, []);

  return (
    <div className="space-y-3">
      {/* Name */}
      <section className={sectionClass}>
        <p className={labelClass}>Name</p>
        <Input
          value={config.name}
          disabled={disabled}
          onChange={(e) => onChange({ name: e.target.value })}
          className="h-8 text-sm"
          placeholder="Setup name"
        />
      </section>

      {/* Action Type */}
      <section className={sectionClass}>
        <div>
          <p className={labelClass}>Action Type</p>
          <p className={sublabelClass}>
            {isClick ? "Automate mouse clicks or hold" : "Automate key press or hold"}
          </p>
        </div>
        <div className="flex gap-1">
          <Button
            variant={isClick ? "secondary" : "ghost"}
            size="sm"
            className="flex-1"
            disabled={disabled}
            onClick={() => onChange({ actionType: "click" })}
          >
            <Mouse className="size-3.5 mr-1.5" />
            Mouse
          </Button>
          <Button
            variant={!isClick ? "secondary" : "ghost"}
            size="sm"
            className="flex-1"
            disabled={disabled}
            onClick={() => onChange({ actionType: "hold-key" })}
          >
            <Keyboard className="size-3.5 mr-1.5" />
            Key
          </Button>
        </div>
      </section>

      {/* Interval — shown when mode needs it */}
      {needsInterval ? (
        <section className={sectionClass}>
          <div className="flex items-center justify-between">
            <p className={labelClass}>Interval</p>
            {intervalIsZero && !disabled ? (
              <span className="text-[10px] text-destructive">Must be greater than 0</span>
            ) : null}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {INTERVAL_FIELDS.map((item) => (
              <div key={item.label} className="space-y-1">
                <p className="text-[10px] text-muted-foreground text-center">{item.label}</p>
                <Input
                  type="number"
                  min="0"
                  value={config[item.key]}
                  disabled={disabled}
                  onChange={(e) => onChange({ [item.key]: Math.max(0, parseInt(e.target.value) || 0) })}
                  className={numberInputClass}
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Mouse settings */}
      {isClick ? (
        <section className={`${sectionClass} border-primary/30`}>
          <p className={`${labelClass} flex items-center gap-1.5`}>
            <Mouse className="size-3.5" />
            Mouse Settings
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground">Button</p>
              <Select
                value={config.mouseButton}
                disabled={disabled}
                onValueChange={(v) => onChange({ mouseButton: v as MouseButton })}
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
              <p className="text-[10px] text-muted-foreground">Mode</p>
              <Select
                value={config.mouseMode}
                disabled={disabled}
                onValueChange={(v) => onChange({ mouseMode: v as MouseMode })}
              >
                <SelectTrigger className="h-8 w-full text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="click">Click</SelectItem>
                  <SelectItem value="hold">Hold (continuous)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Click Type */}
          {config.mouseMode === "click" ? (
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground">Click Type</p>
              <div className="flex gap-1">
                <Button
                  variant={config.clickType === "single" ? "secondary" : "ghost"}
                  size="sm"
                  className="flex-1"
                  disabled={disabled}
                  onClick={() => onChange({ clickType: "single" })}
                >
                  Single
                </Button>
                <Button
                  variant={config.clickType === "double" ? "secondary" : "ghost"}
                  size="sm"
                  className="flex-1"
                  disabled={disabled}
                  onClick={() => onChange({ clickType: "double" })}
                >
                  Double
                </Button>
              </div>
            </div>
          ) : null}

          {/* Cursor Position */}
          <div className="space-y-2 pt-1">
            <p className="text-[10px] text-muted-foreground">Cursor Position</p>
            <div className="flex gap-2 items-end">
              <div className="flex gap-1 flex-1">
                <Button
                  variant={config.locationMode === "current" ? "secondary" : "ghost"}
                  size="sm"
                  className="flex-1"
                  disabled={disabled}
                  onClick={() => onChange({ locationMode: "current" })}
                >
                  Current
                </Button>
                <Button
                  variant={config.locationMode === "fixed" ? "secondary" : "ghost"}
                  size="sm"
                  className="flex-1"
                  disabled={disabled}
                  onClick={() => onChange({ locationMode: "fixed" })}
                >
                  Fixed
                </Button>
              </div>
              {config.locationMode === "fixed" ? (
                <div className="flex gap-1">
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-muted-foreground text-center">X</p>
                    <Input
                      type="number"
                      value={config.fixedX}
                      disabled={disabled}
                      onChange={(e) => onChange({ fixedX: parseInt(e.target.value) || 0 })}
                      className={`w-16 ${numberInputClass}`}
                    />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-muted-foreground text-center">Y</p>
                    <Input
                      type="number"
                      value={config.fixedY}
                      disabled={disabled}
                      onChange={(e) => onChange({ fixedY: parseInt(e.target.value) || 0 })}
                      className={`w-16 ${numberInputClass}`}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Drag controls */}
          {config.mouseMode === "hold" ? (
            <div className="flex items-center gap-4 pt-1">
              <VirtualJoystick
                onChange={handleJoystick}
                speed={config.dragSpeed}
                disabled={!isRunning}
              />
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground">Drag Speed</p>
                  <p className="text-[10px] text-muted-foreground tabular-nums">{config.dragSpeed}</p>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={config.dragSpeed}
                  disabled={disabled}
                  onChange={(e) => onChange({ dragSpeed: parseInt(e.target.value) })}
                  className="w-full h-1.5 accent-primary cursor-pointer"
                />
                <p className="text-[9px] text-muted-foreground/60">
                  Use joystick while running to drag the cursor
                </p>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Key settings */}
      {!isClick ? (
        <section className={`${sectionClass} border-primary/30`}>
          <p className={`${labelClass} flex items-center gap-1.5`}>
            <Keyboard className="size-3.5" />
            Key Settings
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground">Key</p>
              <KeyCapture
                value={config.holdKey}
                disabled={disabled}
                onChange={(v) => { if (v) onChange({ holdKey: v }); }}
              />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground">Mode</p>
              <Select
                value={config.keyMode}
                disabled={disabled}
                onValueChange={(v) => onChange({ keyMode: v as KeyMode })}
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
        </section>
      ) : null}

      {/* Repeat */}
      <section className={sectionClass}>
        <p className={labelClass}>Repeat</p>
        <div className="flex gap-2 items-end">
          <div className="flex gap-1 flex-1">
            <Button
              variant={config.repeatMode === "infinite" ? "secondary" : "ghost"}
              size="sm"
              className="flex-1"
              disabled={disabled}
              onClick={() => onChange({ repeatMode: "infinite" })}
            >
              Infinite
            </Button>
            <Button
              variant={config.repeatMode === "count" ? "secondary" : "ghost"}
              size="sm"
              className="flex-1"
              disabled={disabled}
              onClick={() => onChange({ repeatMode: "count" })}
            >
              Count
            </Button>
          </div>
          {config.repeatMode === "count" ? (
            <Input
              type="number"
              min="1"
              value={config.repeatCount}
              disabled={disabled}
              onChange={(e) => onChange({ repeatCount: Math.max(1, parseInt(e.target.value) || 1) })}
              className={`w-20 ${numberInputClass}`}
            />
          ) : null}
        </div>
      </section>

      {/* Hotkeys */}
      <section className={sectionClass}>
        <HotkeyGrid
          label="Hotkeys"
          value={config.hotkeys}
          onChange={(v) => onChange({ hotkeys: v })}
          disabled={disabled}
        />
      </section>
    </div>
  );
}
