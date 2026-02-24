import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { register, unregister } from "@tauri-apps/plugin-global-shortcut";
import { load } from "@tauri-apps/plugin-store";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActionType = "click" | "hold-key";
type MouseButton = "left" | "right" | "middle";
type ClickType = "single" | "double";
type RepeatMode = "infinite" | "count";
type LocationMode = "current" | "fixed";
type KeyMode = "hold" | "repeat";

interface Settings {
  actionType: ActionType;
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
  mouseButton: MouseButton;
  clickType: ClickType;
  repeatMode: RepeatMode;
  repeatCount: number;
  locationMode: LocationMode;
  fixedX: number;
  fixedY: number;
  holdKey: string;
  keyMode: KeyMode;
  alwaysOnTop: boolean;
  hotkeys: { start: string; stop: string; toggle: string };
}

const DEFAULT_SETTINGS: Settings = {
  actionType: "click",
  hours: 0,
  minutes: 0,
  seconds: 0,
  milliseconds: 20,
  mouseButton: "left",
  clickType: "single",
  repeatMode: "infinite",
  repeatCount: 10,
  locationMode: "current",
  fixedX: 0,
  fixedY: 0,
  holdKey: "e",
  keyMode: "hold",
  alwaysOnTop: false,
  hotkeys: { start: "F6", stop: "F7", toggle: "F8" },
};

// Common keys for the dropdown
const KEY_OPTIONS = [
  { value: "e", label: "E" },
  { value: "f", label: "F" },
  { value: "r", label: "R" },
  { value: "q", label: "Q" },
  { value: "space", label: "Space" },
  { value: "enter", label: "Enter" },
  { value: "shift", label: "Shift" },
  { value: "tab", label: "Tab" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
];

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

function App() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Refs for hotkey callbacks (avoid re-registration on every state change)
  const settingsRef = useRef(settings);
  const runningRef = useRef(running);

  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { runningRef.current = running; }, [running]);

  // Updater helper
  const set = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ---------------------------------------------------------------------------
  // Persistence: load settings on mount, save on change
  // ---------------------------------------------------------------------------

  useEffect(() => {
    (async () => {
      try {
        const store = await load("settings.json", { autoSave: false, defaults: {} });
        const saved = await store.get<Settings>("settings");
        if (saved) {
          setSettings({ ...DEFAULT_SETTINGS, ...saved });
        }
      } catch (err) {
        console.warn("Failed to load settings:", err);
      }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try {
        const store = await load("settings.json", { autoSave: false, defaults: {} });
        await store.set("settings", settings);
        await store.save();
      } catch (err) {
        console.warn("Failed to save settings:", err);
      }
    })();
  }, [settings, loaded]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const startAction = useCallback(async () => {
    if (runningRef.current) return;
    setError(null);
    try {
      const s = settingsRef.current;
      await invoke("start_action", {
        settings: {
          hours: s.hours,
          minutes: s.minutes,
          seconds: s.seconds,
          milliseconds: s.milliseconds,
          mouseButton: s.mouseButton,
          clickType: s.clickType,
          repeatMode: s.repeatMode,
          repeatCount: s.repeatCount,
          locationMode: s.locationMode,
          fixedX: s.fixedX,
          fixedY: s.fixedY,
          actionType: s.actionType,
          holdKey: s.holdKey,
          keyMode: s.keyMode,
        },
      });
      setRunning(true);
    } catch (err) {
      setError(String(err));
    }
  }, []);

  const stopAction = useCallback(async () => {
    if (!runningRef.current) return;
    try {
      await invoke("stop_action");
    } catch (err) {
      setError(String(err));
    }
    setRunning(false);
  }, []);

  const toggleAction = useCallback(async () => {
    // Check backend state directly to avoid any stale ref issues
    const backendRunning = await invoke<boolean>("is_running");
    if (backendRunning) {
      await invoke("stop_action");
      setRunning(false);
    } else {
      setError(null);
      try {
        const s = settingsRef.current;
        await invoke("start_action", {
          settings: {
            hours: s.hours,
            minutes: s.minutes,
            seconds: s.seconds,
            milliseconds: s.milliseconds,
            mouseButton: s.mouseButton,
            clickType: s.clickType,
            repeatMode: s.repeatMode,
            repeatCount: s.repeatCount,
            locationMode: s.locationMode,
            fixedX: s.fixedX,
            fixedY: s.fixedY,
            actionType: s.actionType,
            holdKey: s.holdKey,
            keyMode: s.keyMode,
          },
        });
        setRunning(true);
      } catch (err) {
        setError(String(err));
      }
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Listen for backend "action-stopped" event (count mode completion)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const unlisten = listen("action-stopped", () => {
      setRunning(false);
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  // ---------------------------------------------------------------------------
  // Global hotkeys — register once, callbacks use refs
  // ---------------------------------------------------------------------------

  // Store action refs so hotkey callbacks always call the latest version
  const startRef = useRef(startAction);
  const stopRef = useRef(stopAction);
  const toggleRef = useRef(toggleAction);
  useEffect(() => { startRef.current = startAction; }, [startAction]);
  useEffect(() => { stopRef.current = stopAction; }, [stopAction]);
  useEffect(() => { toggleRef.current = toggleAction; }, [toggleAction]);

  useEffect(() => {
    let disposed = false;

    const hk = settingsRef.current.hotkeys;

    (async () => {
      try {
        await register(hk.start, () => { if (!disposed) startRef.current(); });
        await register(hk.stop, () => { if (!disposed) stopRef.current(); });
        await register(hk.toggle, () => { if (!disposed) toggleRef.current(); });
      } catch (err) {
        console.warn("Failed to register hotkeys:", err);
      }
    })();

    return () => {
      disposed = true;
      unregister(hk.start).catch(() => {});
      unregister(hk.stop).catch(() => {});
      unregister(hk.toggle).catch(() => {});
    };
  // Only re-register when hotkey bindings change, not on every state change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.hotkeys.start, settings.hotkeys.stop, settings.hotkeys.toggle]);

  // ---------------------------------------------------------------------------
  // Always on top
  // ---------------------------------------------------------------------------

  useEffect(() => {
    invoke("set_always_on_top", { enabled: settings.alwaysOnTop }).catch(() => {});
  }, [settings.alwaysOnTop]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const labelClass = "text-[11px] uppercase tracking-wider text-muted-foreground font-medium";
  const sectionClass = "border border-border p-3 space-y-2";
  const disabled = running;

  const hotkeys = settings.hotkeys;

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
              {running ? "RUNNING" : "IDLE"}
            </span>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive text-xs p-2">
            {error}
          </div>
        )}

        {/* Action Type */}
        <div className={sectionClass}>
          <p className={labelClass}>Action Type</p>
          <div className="flex gap-2">
            <Button
              variant={settings.actionType === "click" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              disabled={disabled}
              onClick={() => set("actionType", "click")}
            >
              Mouse Click
            </Button>
            <Button
              variant={settings.actionType === "hold-key" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              disabled={disabled}
              onClick={() => set("actionType", "hold-key")}
            >
              Key Hold
            </Button>
          </div>
        </div>

        {/* Interval */}
        <div className={sectionClass}>
          <p className={labelClass}>Interval</p>
          <div className="grid grid-cols-4 gap-2">
            {([
              { label: "HR", key: "hours" as const },
              { label: "MIN", key: "minutes" as const },
              { label: "SEC", key: "seconds" as const },
              { label: "MS", key: "milliseconds" as const },
            ]).map((item) => (
              <div key={item.label} className="space-y-1">
                <p className="text-[10px] text-muted-foreground text-center">{item.label}</p>
                <Input
                  type="number"
                  min="0"
                  value={settings[item.key]}
                  disabled={disabled}
                  onChange={(e) => set(item.key, Math.max(0, parseInt(e.target.value) || 0))}
                  className="text-center h-8 text-sm [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Mouse Click Options */}
        {settings.actionType === "click" && (
          <div className={sectionClass}>
            <p className={labelClass}>Click Options</p>
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
          </div>
        )}

        {/* Key Hold Options */}
        {settings.actionType === "hold-key" && (
          <div className={sectionClass}>
            <p className={labelClass}>Key Options</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground">Key</p>
                <Select
                  value={settings.holdKey}
                  disabled={disabled}
                  onValueChange={(v) => set("holdKey", v)}
                >
                  <SelectTrigger className="h-8 w-full text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KEY_OPTIONS.map((k) => (
                      <SelectItem key={k.value} value={k.value}>
                        {k.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
          </div>
        )}

        {/* Repeat */}
        <div className={sectionClass}>
          <p className={labelClass}>Repeat</p>
          <div className="flex gap-2 items-end">
            <div className="flex gap-2 flex-1">
              <Button
                variant={settings.repeatMode === "infinite" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                disabled={disabled}
                onClick={() => set("repeatMode", "infinite")}
              >
                Infinite
              </Button>
              <Button
                variant={settings.repeatMode === "count" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                disabled={disabled}
                onClick={() => set("repeatMode", "count")}
              >
                Count
              </Button>
            </div>
            {settings.repeatMode === "count" && (
              <Input
                type="number"
                min="1"
                value={settings.repeatCount}
                disabled={disabled}
                onChange={(e) => set("repeatCount", Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 h-8 text-sm text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            )}
          </div>
        </div>

        {/* Location (click mode only) */}
        {settings.actionType === "click" && (
          <div className={sectionClass}>
            <p className={labelClass}>Cursor Position</p>
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
              {settings.locationMode === "fixed" && (
                <div className="flex gap-1">
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-muted-foreground text-center">X</p>
                    <Input
                      type="number"
                      value={settings.fixedX}
                      disabled={disabled}
                      onChange={(e) => set("fixedX", parseInt(e.target.value) || 0)}
                      className="w-16 h-8 text-sm text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-muted-foreground text-center">Y</p>
                    <Input
                      type="number"
                      value={settings.fixedY}
                      disabled={disabled}
                      onChange={(e) => set("fixedY", parseInt(e.target.value) || 0)}
                      className="w-16 h-8 text-sm text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Hotkeys */}
        <div className={sectionClass}>
          <p className={labelClass}>Hotkeys</p>
          <div className="grid grid-cols-3 gap-2">
            {(["start", "stop", "toggle"] as const).map((op) => (
              <div key={op} className="space-y-1">
                <p className="text-[10px] text-muted-foreground text-center uppercase">{op}</p>
                <Select
                  value={hotkeys[op]}
                  disabled={disabled}
                  onValueChange={(v) =>
                    set("hotkeys", { ...hotkeys, [op]: v })
                  }
                >
                  <SelectTrigger className="h-8 w-full text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["F1","F2","F3","F4","F5","F6","F7","F8","F9","F10","F11","F12"].map((k) => (
                      <SelectItem key={k} value={k}>{k}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <Button
            onClick={startAction}
            disabled={running}
            size="sm"
          >
            START ({hotkeys.start})
          </Button>
          <Button
            onClick={stopAction}
            disabled={!running}
            variant="destructive"
            size="sm"
          >
            STOP ({hotkeys.stop})
          </Button>
          <Button
            onClick={toggleAction}
            variant="outline"
            size="sm"
          >
            TOGGLE ({hotkeys.toggle})
          </Button>
        </div>
      </div>
    </main>
  );
}

export default App;
