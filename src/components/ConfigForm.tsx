import { Mouse, Keyboard } from "lucide-react";
import { DirectionPicker } from "@/components/VirtualJoystick";
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

const labelClass = "text-sm uppercase tracking-widest text-muted-foreground font-bold";
const sublabelClass = "text-sm text-muted-foreground leading-tight";
const sectionClass = "border-2 border-border p-4 space-y-3 transition-all duration-150";
const numberInputClass =
  "text-center h-11 text-base tabular-nums [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

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
}

export function ConfigForm({ config, onChange, disabled = false }: ConfigFormProps) {
  const isClick = config.actionType === "click";
  const needsInterval = isClick
    ? config.mouseMode === "click"
    : config.keyMode === "repeat";
  const intervalIsZero = totalIntervalMs(config) === 0;

  return (
    <div className="space-y-4">
      {/* Name */}
      <section className={sectionClass}>
        <p className={labelClass}>Name</p>
        <Input
          value={config.name}
          disabled={disabled}
          onChange={(e) => onChange({ name: e.target.value })}
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
        <div className="flex gap-2">
          <Button
            variant={isClick ? "secondary" : "ghost"}
            className="flex-1"
            disabled={disabled}
            onClick={() => onChange({ actionType: "click" })}
          >
            <Mouse className="size-5 mr-2" />
            Mouse
          </Button>
          <Button
            variant={!isClick ? "secondary" : "ghost"}
            className="flex-1"
            disabled={disabled}
            onClick={() => onChange({ actionType: "hold-key" })}
          >
            <Keyboard className="size-5 mr-2" />
            Key
          </Button>
        </div>
      </section>

      {/* Interval -- shown when mode needs it */}
      {needsInterval ? (
        <section className={sectionClass}>
          <div className="flex items-center justify-between">
            <p className={labelClass}>Interval</p>
            {intervalIsZero && !disabled ? (
              <span className="text-sm text-destructive font-medium">Must be &gt; 0</span>
            ) : null}
          </div>
          <div className="grid grid-cols-4 gap-3">
            {INTERVAL_FIELDS.map((item) => (
              <div key={item.label} className="space-y-1">
                <p className="text-xs text-muted-foreground text-center uppercase tracking-widest font-medium">{item.label}</p>
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
        <section className={`${sectionClass} border-primary/40`}>
          <p className={`${labelClass} flex items-center gap-2`}>
            <Mouse className="size-5" />
            Mouse Settings
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">Button</p>
              <Select
                value={config.mouseButton}
                disabled={disabled}
                onValueChange={(v) => onChange({ mouseButton: v as MouseButton })}
              >
                <SelectTrigger className="w-full">
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
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">Mode</p>
              <Select
                value={config.mouseMode}
                disabled={disabled}
                onValueChange={(v) => onChange({ mouseMode: v as MouseMode })}
              >
                <SelectTrigger className="w-full">
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
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">Click Type</p>
              <div className="flex gap-2">
                <Button
                  variant={config.clickType === "single" ? "secondary" : "ghost"}
                  className="flex-1"
                  disabled={disabled}
                  onClick={() => onChange({ clickType: "single" })}
                >
                  Single
                </Button>
                <Button
                  variant={config.clickType === "double" ? "secondary" : "ghost"}
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
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">Cursor Position</p>
            <div className="flex gap-3 items-end">
              <div className="flex gap-2 flex-1">
                <Button
                  variant={config.locationMode === "current" ? "secondary" : "ghost"}
                  className="flex-1"
                  disabled={disabled}
                  onClick={() => onChange({ locationMode: "current" })}
                >
                  Current
                </Button>
                <Button
                  variant={config.locationMode === "fixed" ? "secondary" : "ghost"}
                  className="flex-1"
                  disabled={disabled}
                  onClick={() => onChange({ locationMode: "fixed" })}
                >
                  Fixed
                </Button>
              </div>
              {config.locationMode === "fixed" ? (
                <div className="flex gap-2">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground text-center uppercase tracking-widest font-medium">X</p>
                    <Input
                      type="number"
                      value={config.fixedX}
                      disabled={disabled}
                      onChange={(e) => onChange({ fixedX: parseInt(e.target.value) || 0 })}
                      className={`w-20 ${numberInputClass}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground text-center uppercase tracking-widest font-medium">Y</p>
                    <Input
                      type="number"
                      value={config.fixedY}
                      disabled={disabled}
                      onChange={(e) => onChange({ fixedY: parseInt(e.target.value) || 0 })}
                      className={`w-20 ${numberInputClass}`}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Drag controls */}
          {config.mouseMode === "hold" ? (
            <div className="flex items-center gap-5 pt-2">
              <DirectionPicker
                directionX={config.dragDirectionX}
                directionY={config.dragDirectionY}
                onChange={(dx, dy) => onChange({ dragDirectionX: dx, dragDirectionY: dy })}
                disabled={disabled}
                size={72}
              />
              <div className="flex-1 space-y-2">
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground">Drag Speed</p>
                  <Input
                    type="number"
                    min="1"
                    value={config.dragSpeed}
                    disabled={disabled}
                    onChange={(e) => onChange({ dragSpeed: Math.max(1, parseInt(e.target.value) || 1) })}
                    className={numberInputClass}
                  />
                </div>
                <p className="text-[9px] text-muted-foreground/60">
                  Pixels per tick (~60fps). Set direction, then toggle on to drag continuously.
                </p>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Key settings */}
      {!isClick ? (
        <section className={`${sectionClass} border-primary/40`}>
          <p className={`${labelClass} flex items-center gap-2`}>
            <Keyboard className="size-5" />
            Key Settings
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">Key</p>
              <KeyCapture
                value={config.holdKey}
                disabled={disabled}
                onChange={(v) => { if (v) onChange({ holdKey: v }); }}
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">Mode</p>
              <Select
                value={config.keyMode}
                disabled={disabled}
                onValueChange={(v) => onChange({ keyMode: v as KeyMode })}
              >
                <SelectTrigger className="w-full">
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
        <div className="flex gap-3 items-end">
          <div className="flex gap-2 flex-1">
            <Button
              variant={config.repeatMode === "infinite" ? "secondary" : "ghost"}
              className="flex-1"
              disabled={disabled}
              onClick={() => onChange({ repeatMode: "infinite" })}
            >
              Infinite
            </Button>
            <Button
              variant={config.repeatMode === "count" ? "secondary" : "ghost"}
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
              className={`w-24 ${numberInputClass}`}
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
