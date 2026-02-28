import type { InputConfig, AppState } from "@/types/settings";

export const DEFAULT_CONFIG: Omit<InputConfig, "id"> = {
  name: "New Setup",
  actionType: "click",
  hours: 0,
  minutes: 0,
  seconds: 0,
  milliseconds: 20,
  repeatMode: "infinite",
  repeatCount: 10,
  mouseButton: "left",
  mouseMode: "click",
  clickType: "single",
  dragSpeed: 5,
  dragDirectionX: 0,
  dragDirectionY: -1, // default: drag upward (north)
  locationMode: "current",
  fixedX: 0,
  fixedY: 0,
  holdKey: "e",
  keyMode: "hold",
  hotkeys: { start: null, stop: null, toggle: null },
};

export const DEFAULT_APP_STATE: AppState = {
  configs: [],
};
