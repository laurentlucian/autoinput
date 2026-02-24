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
type HotkeyLayout = "shared" | "independent";

interface HotkeySet {
  start: string;
  stop: string;
  toggle: string;
}

interface Settings {
  activeMode: ActionType;
  hotkeyLayout: HotkeyLayout;
  // Shared
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
  repeatMode: RepeatMode;
  repeatCount: number;
  alwaysOnTop: boolean;
  hotkeys: HotkeySet;
  clickHotkeys: HotkeySet;
  keyHoldHotkeys: HotkeySet;
  // Mouse Click settings
  mouseButton: MouseButton;
  clickType: ClickType;
  locationMode: LocationMode;
  fixedX: number;
  fixedY: number;
  // Key Hold settings
  holdKey: string;
  keyMode: KeyMode;
}

const DEFAULT_SETTINGS: Settings = {
  activeMode: "click",
  hotkeyLayout: "shared",
  hours: 0,
  minutes: 0,
  seconds: 0,
  milliseconds: 20,
  repeatMode: "infinite",
  repeatCount: 10,
  alwaysOnTop: false,
  hotkeys: { start: "F6", stop: "F7", toggle: "F8" },
  clickHotkeys: { start: "F6", stop: "F7", toggle: "F8" },
  keyHoldHotkeys: { start: "F9", stop: "F10", toggle: "F11" },
  mouseButton: "left",
  clickType: "single",
  locationMode: "current",
  fixedX: 0,
  fixedY: 0,
  holdKey: "e",
  keyMode: "hold",
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

const FKEYS = ["F1","F2","F3","F4","F5","F6","F7","F8","F9","F10","F11","F12"];

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

function App() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [running, setRunning] = useState(false);
  const [runningMode, setRunningMode] = useState<ActionType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Refs for hotkey callbacks (avoid re-registration on every state change)
  const settingsRef = useRef(settings);
  const runningRef = useRef(running);
  const runningModeRef = useRef(runningMode);
  const toggleBusy = useRef(false);

  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { runningRef.current = running; }, [running]);
  useEffect(() => { runningModeRef.current = runningMode; }, [runningMode]);

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
        const saved = await store.get<Partial<Settings> & { actionType?: ActionType }>("settings");
        if (saved) {
          // Migrate old `actionType` field to `activeMode`
          if (saved.actionType && !saved.activeMode) {
            saved.activeMode = saved.actionType;
          }
          const { actionType: _, ...rest } = saved;
          setSettings({ ...DEFAULT_SETTINGS, ...rest });
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
  // Actions — mode-aware helpers
  // ---------------------------------------------------------------------------

  const buildPayload = useCallback((s: Settings, mode: ActionType) => ({
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
    actionType: mode,
    holdKey: s.holdKey,
    keyMode: s.keyMode,
  }), []);

  const startMode = useCallback(async (mode: ActionType) => {
    setError(null);
    try {
      // If something is already running, stop it first
      if (runningRef.current) {
        await invoke("stop_action");
      }
      const s = settingsRef.current;
      await invoke("start_action", { settings: buildPayload(s, mode) });
      setRunning(true);
      setRunningMode(mode);
    } catch (err) {
      setError(String(err));
    }
  }, [buildPayload]);

  const stopCurrent = useCallback(async () => {
    if (!runningRef.current) return;
    try {
      await invoke("stop_action");
    } catch (err) {
      setError(String(err));
    }
    setRunning(false);
    setRunningMode(null);
  }, []);

  const toggleMode = useCallback(async (mode: ActionType) => {
    if (toggleBusy.current) return;
    toggleBusy.current = true;

    try {
      const backendRunning = await invoke<boolean>("is_running");
      const currentMode = runningModeRef.current;

      if (backendRunning && currentMode === mode) {
        // Same mode running → stop it
        await invoke("stop_action");
        setRunning(false);
        setRunningMode(null);
      } else {
        // Different mode or nothing running → stop whatever + start this mode
        if (backendRunning) {
          await invoke("stop_action");
        }
        setError(null);
        const s = settingsRef.current;
        await invoke("start_action", { settings: buildPayload(s, mode) });
        setRunning(true);
        setRunningMode(mode);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setTimeout(() => { toggleBusy.current = false; }, 300);
    }
  }, [buildPayload]);

  // Shared-mode wrappers (use activeMode from settings)
  const startAction = useCallback(async () => {
    if (runningRef.current) return;
    await startMode(settingsRef.current.activeMode);
  }, [startMode]);

  const stopAction = useCallback(async () => {
    await stopCurrent();
  }, [stopCurrent]);

  const toggleAction = useCallback(async () => {
    await toggleMode(settingsRef.current.activeMode);
  }, [toggleMode]);

  // ---------------------------------------------------------------------------
  // Listen for backend "action-stopped" event (count mode completion)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const unlisten = listen("action-stopped", () => {
      setRunning(false);
      setRunningMode(null);
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  // ---------------------------------------------------------------------------
  // Global hotkeys — register once, callbacks use refs
  // ---------------------------------------------------------------------------

  // Refs for shared hotkey callbacks
  const startRef = useRef(startAction);
  const stopRef = useRef(stopAction);
  const toggleRef = useRef(toggleAction);
  useEffect(() => { startRef.current = startAction; }, [startAction]);
  useEffect(() => { stopRef.current = stopAction; }, [stopAction]);
  useEffect(() => { toggleRef.current = toggleAction; }, [toggleAction]);

  // Refs for independent hotkey callbacks
  const startClickRef = useRef(() => startMode("click"));
  const stopClickRef = useRef(stopCurrent);
  const toggleClickRef = useRef(() => toggleMode("click"));
  const startKeyHoldRef = useRef(() => startMode("hold-key"));
  const stopKeyHoldRef = useRef(stopCurrent);
  const toggleKeyHoldRef = useRef(() => toggleMode("hold-key"));
  useEffect(() => { startClickRef.current = () => startMode("click"); }, [startMode]);
  useEffect(() => { stopClickRef.current = stopCurrent; }, [stopCurrent]);
  useEffect(() => { toggleClickRef.current = () => toggleMode("click"); }, [toggleMode]);
  useEffect(() => { startKeyHoldRef.current = () => startMode("hold-key"); }, [startMode]);
  useEffect(() => { stopKeyHoldRef.current = stopCurrent; }, [stopCurrent]);
  useEffect(() => { toggleKeyHoldRef.current = () => toggleMode("hold-key"); }, [toggleMode]);

  // Collect all hotkey strings that need registering so we can dedupe deps
  const isShared = settings.hotkeyLayout === "shared";
  const sharedHk = settings.hotkeys;
  const clickHk = settings.clickHotkeys;
  const keyHoldHk = settings.keyHoldHotkeys;

  useEffect(() => {
    let disposed = false;
    const keys: string[] = [];

    const safeRegister = async (key: string, cb: () => void) => {
      keys.push(key);
      await register(key, () => { if (!disposed) cb(); });
    };

    (async () => {
      try {
        if (isShared) {
          const hk = settingsRef.current.hotkeys;
          await safeRegister(hk.start, () => startRef.current());
          await safeRegister(hk.stop, () => stopRef.current());
          await safeRegister(hk.toggle, () => toggleRef.current());
        } else {
          const chk = settingsRef.current.clickHotkeys;
          const khk = settingsRef.current.keyHoldHotkeys;
          await safeRegister(chk.start, () => startClickRef.current());
          await safeRegister(chk.stop, () => stopClickRef.current());
          await safeRegister(chk.toggle, () => toggleClickRef.current());
          await safeRegister(khk.start, () => startKeyHoldRef.current());
          await safeRegister(khk.stop, () => stopKeyHoldRef.current());
          await safeRegister(khk.toggle, () => toggleKeyHoldRef.current());
        }
      } catch (err) {
        console.warn("Failed to register hotkeys:", err);
      }
    })();

    return () => {
      disposed = true;
      keys.forEach((k) => unregister(k).catch(() => {}));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isShared,
    sharedHk.start, sharedHk.stop, sharedHk.toggle,
    clickHk.start, clickHk.stop, clickHk.toggle,
    keyHoldHk.start, keyHoldHk.stop, keyHoldHk.toggle,
  ]);

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

  const isClickActive = settings.activeMode === "click";
  const isClickRunning = running && runningMode === "click";
  const isKeyHoldRunning = running && runningMode === "hold-key";

  // Hotkey selector grid component
  const HotkeyGrid = ({ value, onChange, label }: {
    value: HotkeySet;
    onChange: (v: HotkeySet) => void;
    label?: string;
  }) => (
    <div className="space-y-2">
      {label && <p className="text-[10px] text-muted-foreground">{label}</p>}
      <div className="grid grid-cols-3 gap-2">
        {(["start", "stop", "toggle"] as const).map((op) => (
          <div key={op} className="space-y-1">
            <p className="text-[10px] text-muted-foreground text-center uppercase">{op}</p>
            <Select
              value={value[op]}
              disabled={disabled}
              onValueChange={(v) => onChange({ ...value, [op]: v })}
            >
              <SelectTrigger className="h-8 w-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FKEYS.map((k) => (
                  <SelectItem key={k} value={k}>{k}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );

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
              {running ? `RUNNING · ${runningMode === "click" ? "CLICK" : "KEY"}` : "IDLE"}
            </span>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive text-xs p-2">
            {error}
          </div>
        )}

        {/* Hotkey Layout Toggle */}
        <div className={sectionClass}>
          <p className={labelClass}>Hotkey Layout</p>
          <div className="flex gap-2">
            <Button
              variant={isShared ? "default" : "outline"}
              size="sm"
              className="flex-1"
              disabled={disabled}
              onClick={() => set("hotkeyLayout", "shared")}
            >
              Shared
            </Button>
            <Button
              variant={!isShared ? "default" : "outline"}
              size="sm"
              className="flex-1"
              disabled={disabled}
              onClick={() => set("hotkeyLayout", "independent")}
            >
              Independent
            </Button>
          </div>
        </div>

        {/* Active Mode Toggle — only in shared mode */}
        {isShared && (
          <div className={sectionClass}>
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
                variant={!isClickActive ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => set("activeMode", "hold-key")}
              >
                Key Hold
              </Button>
            </div>
          </div>
        )}

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

        {/* Mouse Click Options — always visible */}
        <div className={`${sectionClass} ${
          isClickRunning ? "border-destructive/50" :
          (isShared && isClickActive) || !isShared ? "border-primary/50" : "opacity-60"
        }`}>
          <div className="flex items-center justify-between">
            <p className={labelClass}>Mouse Click</p>
            {isClickRunning && (
              <span className="text-[10px] uppercase tracking-wider text-destructive font-medium">Running</span>
            )}
            {!isClickRunning && isShared && isClickActive && (
              <span className="text-[10px] uppercase tracking-wider text-primary font-medium">Active</span>
            )}
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
          {/* Independent hotkeys for click */}
          {!isShared && (
            <HotkeyGrid
              label="Hotkeys"
              value={settings.clickHotkeys}
              onChange={(v) => set("clickHotkeys", v)}
            />
          )}
        </div>

        {/* Key Hold Options — always visible */}
        <div className={`${sectionClass} ${
          isKeyHoldRunning ? "border-destructive/50" :
          (isShared && !isClickActive) || !isShared ? "border-primary/50" : "opacity-60"
        }`}>
          <div className="flex items-center justify-between">
            <p className={labelClass}>Key Hold</p>
            {isKeyHoldRunning && (
              <span className="text-[10px] uppercase tracking-wider text-destructive font-medium">Running</span>
            )}
            {!isKeyHoldRunning && isShared && !isClickActive && (
              <span className="text-[10px] uppercase tracking-wider text-primary font-medium">Active</span>
            )}
          </div>
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
          {/* Independent hotkeys for key hold */}
          {!isShared && (
            <HotkeyGrid
              label="Hotkeys"
              value={settings.keyHoldHotkeys}
              onChange={(v) => set("keyHoldHotkeys", v)}
            />
          )}
        </div>

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

        {/* Shared Hotkeys — only in shared mode */}
        {isShared && (
          <div className={sectionClass}>
            <p className={labelClass}>Hotkeys</p>
            <div className="grid grid-cols-3 gap-2">
              {(["start", "stop", "toggle"] as const).map((op) => (
                <div key={op} className="space-y-1">
                  <p className="text-[10px] text-muted-foreground text-center uppercase">{op}</p>
                  <Select
                    value={settings.hotkeys[op]}
                    disabled={disabled}
                    onValueChange={(v) =>
                      set("hotkeys", { ...settings.hotkeys, [op]: v })
                    }
                  >
                    <SelectTrigger className="h-8 w-full text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FKEYS.map((k) => (
                        <SelectItem key={k} value={k}>{k}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        {isShared ? (
          <div className="grid grid-cols-3 gap-2 pt-1">
            <Button onClick={startAction} disabled={running} size="sm">
              START ({settings.hotkeys.start})
            </Button>
            <Button onClick={stopAction} disabled={!running} variant="destructive" size="sm">
              STOP ({settings.hotkeys.stop})
            </Button>
            <Button onClick={toggleAction} variant="outline" size="sm">
              TOGGLE ({settings.hotkeys.toggle})
            </Button>
          </div>
        ) : (
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-3 gap-2">
              <Button onClick={() => startMode("click")} disabled={isClickRunning} size="sm">
                CLICK ({settings.clickHotkeys.start})
              </Button>
              <Button onClick={() => { if (isClickRunning) stopCurrent(); }} disabled={!isClickRunning} variant="destructive" size="sm">
                STOP ({settings.clickHotkeys.stop})
              </Button>
              <Button onClick={() => toggleMode("click")} variant="outline" size="sm">
                TOGGLE ({settings.clickHotkeys.toggle})
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button onClick={() => startMode("hold-key")} disabled={isKeyHoldRunning} size="sm">
                KEY ({settings.keyHoldHotkeys.start})
              </Button>
              <Button onClick={() => { if (isKeyHoldRunning) stopCurrent(); }} disabled={!isKeyHoldRunning} variant="destructive" size="sm">
                STOP ({settings.keyHoldHotkeys.stop})
              </Button>
              <Button onClick={() => toggleMode("hold-key")} variant="outline" size="sm">
                TOGGLE ({settings.keyHoldHotkeys.toggle})
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default App;
