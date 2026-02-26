export type ActionType = "click" | "hold-key";
export type MouseButton = "left" | "right" | "middle";
export type ClickType = "single" | "double";
export type MouseMode = "click" | "hold";
export type RepeatMode = "infinite" | "count";
export type LocationMode = "current" | "fixed";
export type KeyMode = "hold" | "repeat";

export interface HotkeySet {
  start: string | null;
  stop: string | null;
  toggle: string | null;
}

/**
 * A single input automation configuration.
 * Users build a list of these, each independently runnable.
 */
export interface InputConfig {
  id: string;
  name: string;
  actionType: ActionType;

  // Interval (for click / key-repeat modes)
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;

  // Repeat
  repeatMode: RepeatMode;
  repeatCount: number;

  // Mouse settings
  mouseButton: MouseButton;
  mouseMode: MouseMode;
  clickType: ClickType;
  dragSpeed: number;
  dragDirectionX: number; // -1..+1 normalized
  dragDirectionY: number; // -1..+1 normalized
  locationMode: LocationMode;
  fixedX: number;
  fixedY: number;

  // Key settings
  holdKey: string;
  keyMode: KeyMode;

  // Per-config hotkeys
  hotkeys: HotkeySet;
}

/**
 * App-level settings (not per-config).
 */
export interface AppSettings {
  alwaysOnTop: boolean;
}

/**
 * Full persisted state.
 */
export interface AppState {
  configs: InputConfig[];
  settings: AppSettings;
}

// ---- Legacy type kept for migration ----
export type HotkeyLayout = "shared" | "independent";

export interface LegacySettings {
  activeMode: ActionType;
  hotkeyLayout: HotkeyLayout;
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
  mouseButton: MouseButton;
  mouseMode: MouseMode;
  clickType: ClickType;
  dragSpeed: number;
  locationMode: LocationMode;
  fixedX: number;
  fixedY: number;
  holdKey: string;
  keyMode: KeyMode;
}
