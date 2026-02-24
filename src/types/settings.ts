export type ActionType = "click" | "hold-key";
export type MouseButton = "left" | "right" | "middle";
export type ClickType = "single" | "double";
export type RepeatMode = "infinite" | "count";
export type LocationMode = "current" | "fixed";
export type KeyMode = "hold" | "repeat";
export type HotkeyLayout = "shared" | "independent";

export interface HotkeySet {
  start: string | null;
  stop: string | null;
  toggle: string | null;
}

export interface Settings {
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
