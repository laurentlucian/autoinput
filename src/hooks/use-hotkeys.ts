import { useEffect } from "react";
import { register, unregister } from "@tauri-apps/plugin-global-shortcut";
import type { InputConfig } from "@/types/settings";
import { useLatest } from "./use-latest";

interface HotkeyActions {
  startConfig: (config: InputConfig) => void;
  stopCurrent: () => void;
  toggleConfig: (config: InputConfig) => void;
}

/**
 * Registers global hotkeys for all configs in the list.
 * Each config has its own start/stop/toggle hotkeys.
 */
export function useHotkeys(configs: InputConfig[], actions: HotkeyActions) {
  const actionsRef = useLatest(actions);
  const configsRef = useLatest(configs);

  // Build a stable dependency string from all hotkey bindings
  const hotkeyFingerprint = configs
    .map((c) => `${c.id}:${c.hotkeys.start}:${c.hotkeys.stop}:${c.hotkeys.toggle}`)
    .join("|");

  useEffect(() => {
    let disposed = false;
    const keys: string[] = [];

    const safeRegister = async (key: string | null, cb: () => void) => {
      if (!key) return;
      // Avoid registering the same key twice
      if (keys.includes(key)) return;
      keys.push(key);
      try {
        await register(key, () => {
          if (!disposed) cb();
        });
      } catch {
        // Key might already be registered by OS or conflicting
      }
    };

    (async () => {
      try {
        for (const config of configsRef.current) {
          const cfg = config; // capture for closure
          await safeRegister(cfg.hotkeys.start, () => actionsRef.current.startConfig(cfg));
          await safeRegister(cfg.hotkeys.stop, () => actionsRef.current.stopCurrent());
          await safeRegister(cfg.hotkeys.toggle, () => actionsRef.current.toggleConfig(cfg));
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
  }, [hotkeyFingerprint, actionsRef, configsRef]);
}
