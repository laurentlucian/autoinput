import { useEffect } from "react";
import { register, unregister } from "@tauri-apps/plugin-global-shortcut";
import type { ActionType, Settings } from "@/types/settings";
import { useLatest } from "./use-latest";

interface HotkeyActions {
  startAction: () => void;
  stopAction: () => void;
  toggleAction: () => void;
  startMode: (mode: ActionType) => void;
  stopCurrent: () => void;
  toggleMode: (mode: ActionType) => void;
}

/**
 * Registers global hotkeys based on the current hotkey layout (shared or independent).
 *
 * Uses useLatest refs for action callbacks so the hotkey registration effect
 * only re-runs when the actual hotkey *bindings* change, not when callbacks update.
 *
 * @see advanced-event-handler-refs (Vercel React Best Practices)
 */
export function useHotkeys(settings: Settings, actions: HotkeyActions) {
  const actionsRef = useLatest(actions);

  const isShared = settings.hotkeyLayout === "shared";
  const { hotkeys: sharedHk, clickHotkeys: clickHk, keyHoldHotkeys: keyHoldHk } = settings;

  useEffect(() => {
    let disposed = false;
    const keys: string[] = [];

    const safeRegister = async (key: string | null, cb: () => void) => {
      if (!key) return; // skip disabled hotkeys
      keys.push(key);
      await register(key, () => {
        if (!disposed) cb();
      });
    };

    (async () => {
      try {
        if (isShared) {
          await safeRegister(sharedHk.start, () => actionsRef.current.startAction());
          await safeRegister(sharedHk.stop, () => actionsRef.current.stopAction());
          await safeRegister(sharedHk.toggle, () => actionsRef.current.toggleAction());
        } else {
          await safeRegister(clickHk.start, () => actionsRef.current.startMode("click"));
          await safeRegister(clickHk.stop, () => actionsRef.current.stopCurrent());
          await safeRegister(clickHk.toggle, () => actionsRef.current.toggleMode("click"));
          await safeRegister(keyHoldHk.start, () => actionsRef.current.startMode("hold-key"));
          await safeRegister(keyHoldHk.stop, () => actionsRef.current.stopCurrent());
          await safeRegister(keyHoldHk.toggle, () => actionsRef.current.toggleMode("hold-key"));
        }
      } catch (err) {
        console.warn("Failed to register hotkeys:", err);
      }
    })();

    return () => {
      disposed = true;
      keys.forEach((k) => unregister(k).catch(() => {}));
    };
  }, [
    isShared,
    sharedHk.start, sharedHk.stop, sharedHk.toggle,
    clickHk.start, clickHk.stop, clickHk.toggle,
    keyHoldHk.start, keyHoldHk.stop, keyHoldHk.toggle,
    actionsRef,
  ]);
}
