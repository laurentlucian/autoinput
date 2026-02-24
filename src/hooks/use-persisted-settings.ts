import { useState, useEffect, useCallback } from "react";
import { load } from "@tauri-apps/plugin-store";
import type { ActionType, Settings } from "@/types/settings";
import { DEFAULT_SETTINGS } from "@/lib/constants";

const STORE_FILE = "settings.json";
const STORE_KEY = "settings";

/**
 * Loads saved settings from disk and applies legacy migration.
 * Extracted from the hook so React Compiler doesn't need to analyze
 * conditional expressions inside try/catch.
 */
async function loadSettings(): Promise<Settings | null> {
  try {
    const store = await load(STORE_FILE, { autoSave: false, defaults: {} });
    const saved = await store.get<Partial<Settings> & { actionType?: ActionType }>(STORE_KEY);

    if (!saved) return null;

    // Migrate legacy `actionType` -> `activeMode`
    if (saved.actionType && !saved.activeMode) {
      saved.activeMode = saved.actionType;
    }
    const { actionType: _, ...rest } = saved;
    return { ...DEFAULT_SETTINGS, ...rest };
  } catch (err) {
    console.warn("Failed to load settings:", err);
    return null;
  }
}

/**
 * Persists settings to disk.
 */
async function saveSettings(settings: Settings): Promise<void> {
  try {
    const store = await load(STORE_FILE, { autoSave: false, defaults: {} });
    await store.set(STORE_KEY, settings);
    await store.save();
  } catch (err) {
    console.warn("Failed to save settings:", err);
  }
}

/**
 * Manages settings state with persistence to Tauri's plugin-store.
 * Handles loading, saving, and migration of legacy fields.
 */
export function usePersistedSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  // Load settings from disk on mount
  useEffect(() => {
    loadSettings().then((saved) => {
      if (saved) setSettings(saved);
      setLoaded(true);
    });
  }, []);

  // Persist settings to disk on change
  useEffect(() => {
    if (!loaded) return;
    saveSettings(settings);
  }, [settings, loaded]);

  // Type-safe updater for a single settings key
  // Uses functional setState to avoid stale closures (rerender-functional-setstate)
  const set = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  return { settings, setSettings, set, loaded } as const;
}
