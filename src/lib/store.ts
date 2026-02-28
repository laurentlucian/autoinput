import { load } from "@tauri-apps/plugin-store";
import { nanoid } from "nanoid";
import type { InputConfig, AppState } from "@/types/settings";
import { DEFAULT_APP_STATE, DEFAULT_CONFIG } from "@/lib/constants";

const STORE_FILE = "settings.json";
const STATE_KEY = "appState";
const LEGACY_KEY = "settings";

/**
 * Migrate legacy single-settings format to the new multi-config format.
 */
function migrateLegacy(legacy: Record<string, unknown>): AppState {
  const l = legacy as {
    hours: number; minutes: number; seconds: number; milliseconds: number;
    repeatMode: string; repeatCount: number; mouseButton: string; mouseMode: string;
    clickType: string; dragSpeed: number; locationMode: string; fixedX: number; fixedY: number;
    holdKey: string; keyMode: string;
    hotkeys?: { start: string; stop: string; toggle: string };
    clickHotkeys?: { start: string; stop: string; toggle: string };
    keyHoldHotkeys?: { start: string; stop: string; toggle: string };
  };

  const configs: InputConfig[] = [];

  // Create a mouse config from legacy if it was used
  const mouseConfig: InputConfig = {
    id: nanoid(),
    name: "Mouse (migrated)",
    actionType: "click",
    hours: l.hours,
    minutes: l.minutes,
    seconds: l.seconds,
    milliseconds: l.milliseconds,
    repeatMode: l.repeatMode as InputConfig["repeatMode"],
    repeatCount: l.repeatCount,
    mouseButton: l.mouseButton as InputConfig["mouseButton"],
    mouseMode: l.mouseMode as InputConfig["mouseMode"],
    clickType: l.clickType as InputConfig["clickType"],
    dragSpeed: l.dragSpeed,
    dragDirectionX: 0,
    dragDirectionY: -1,
    locationMode: l.locationMode as InputConfig["locationMode"],
    fixedX: l.fixedX,
    fixedY: l.fixedY,
    holdKey: l.holdKey,
    keyMode: l.keyMode as InputConfig["keyMode"],
    hotkeys: l.hotkeys ?? l.clickHotkeys ?? { start: "F6", stop: "F7", toggle: "F8" },
  };
  configs.push(mouseConfig);

  // Create a key config from legacy
  const keyConfig: InputConfig = {
    id: nanoid(),
    name: "Key (migrated)",
    actionType: "hold-key",
    hours: l.hours,
    minutes: l.minutes,
    seconds: l.seconds,
    milliseconds: l.milliseconds,
    repeatMode: l.repeatMode as InputConfig["repeatMode"],
    repeatCount: l.repeatCount,
    mouseButton: l.mouseButton as InputConfig["mouseButton"],
    mouseMode: l.mouseMode as InputConfig["mouseMode"],
    clickType: l.clickType as InputConfig["clickType"],
    dragSpeed: l.dragSpeed,
    dragDirectionX: 0,
    dragDirectionY: -1,
    locationMode: l.locationMode as InputConfig["locationMode"],
    fixedX: l.fixedX,
    fixedY: l.fixedY,
    holdKey: l.holdKey,
    keyMode: l.keyMode as InputConfig["keyMode"],
    hotkeys: l.keyHoldHotkeys ?? { start: "F9", stop: "F10", toggle: "F11" },
  };
  configs.push(keyConfig);

  return { configs };
}

export async function loadAppState(): Promise<AppState> {
  try {
    const store = await load(STORE_FILE, { autoSave: false, defaults: {} });

    // Try new format first
    const state = await store.get<AppState>(STATE_KEY);
    if (state && Array.isArray(state.configs)) {
      // Back-fill defaults for any new fields added after initial release
      for (const cfg of state.configs) {
        if (cfg.dragDirectionX == null) cfg.dragDirectionX = 0;
        if (cfg.dragDirectionY == null) cfg.dragDirectionY = -1;
      }
      return { ...DEFAULT_APP_STATE, ...state };
    }

    // Fall back to legacy migration
    const legacy = await store.get<Record<string, unknown>>(LEGACY_KEY);
    if (legacy) {
      const migrated = migrateLegacy(legacy);
      // Save migrated state and clean up
      await store.set(STATE_KEY, migrated);
      await store.delete(LEGACY_KEY);
      await store.save();
      return migrated;
    }

    return DEFAULT_APP_STATE;
  } catch (err) {
    console.warn("Failed to load app state:", err);
    return DEFAULT_APP_STATE;
  }
}

export async function saveAppState(state: AppState): Promise<void> {
  try {
    const store = await load(STORE_FILE, { autoSave: false, defaults: {} });
    await store.set(STATE_KEY, state);
    await store.save();
  } catch (err) {
    console.warn("Failed to save app state:", err);
  }
}

export function createConfig(overrides: Partial<InputConfig> = {}): InputConfig {
  return {
    ...DEFAULT_CONFIG,
    id: nanoid(),
    ...overrides,
  };
}
