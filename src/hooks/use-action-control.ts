import { useState, useCallback, useEffect, useRef, createContext, useContext } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { InputConfig, ActionType } from "@/types/settings";
import { useLatest } from "./use-latest";

interface ActionPayload {
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
  mouseButton: string;
  clickType: string;
  repeatMode: string;
  repeatCount: number;
  locationMode: string;
  fixedX: number;
  fixedY: number;
  actionType: ActionType;
  mouseMode: string;
  dragSpeed: number;
  dragDirectionX: number;
  dragDirectionY: number;
  holdKey: string;
  keyMode: string;
}

function buildPayload(config: InputConfig): ActionPayload {
  return {
    hours: config.hours,
    minutes: config.minutes,
    seconds: config.seconds,
    milliseconds: config.milliseconds,
    mouseButton: config.mouseButton,
    clickType: config.clickType,
    repeatMode: config.repeatMode,
    repeatCount: config.repeatCount,
    locationMode: config.locationMode,
    fixedX: config.fixedX,
    fixedY: config.fixedY,
    actionType: config.actionType,
    mouseMode: config.mouseMode,
    dragSpeed: config.dragSpeed,
    dragDirectionX: config.dragDirectionX,
    dragDirectionY: config.dragDirectionY,
    holdKey: config.holdKey,
    keyMode: config.keyMode,
  };
}

export interface ActionControlState {
  runningId: string | null;
  error: string | null;
  startConfig: (config: InputConfig) => Promise<void>;
  stopCurrent: () => Promise<void>;
  toggleConfig: (config: InputConfig) => Promise<void>;
  clearError: () => void;
}

const ActionControlContext = createContext<ActionControlState | null>(null);

/**
 * Provider hook — call once in the root layout.
 */
export function useActionControlProvider(): ActionControlState {
  const [runningId, setRunningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runningIdRef = useLatest(runningId);
  const toggleBusy = useRef(false);

  // Listen for backend "action-stopped" event
  useEffect(() => {
    const unlisten = listen("action-stopped", () => {
      setRunningId(null);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const startConfig = useCallback(async (config: InputConfig) => {
    setError(null);
    try {
      if (runningIdRef.current) {
        await invoke("stop_action");
      }
      await invoke("start_action", { settings: buildPayload(config) });
      setRunningId(config.id);
    } catch (err) {
      setError(String(err));
    }
  }, [runningIdRef]);

  const stopCurrent = useCallback(async () => {
    if (!runningIdRef.current) return;
    try {
      await invoke("stop_action");
    } catch (err) {
      setError(String(err));
    }
    setRunningId(null);
  }, [runningIdRef]);

  const toggleConfig = useCallback(async (config: InputConfig) => {
    if (toggleBusy.current) return;
    toggleBusy.current = true;

    try {
      const backendRunning = await invoke<boolean>("is_running");

      if (backendRunning && runningIdRef.current === config.id) {
        await invoke("stop_action");
        setRunningId(null);
      } else {
        if (backendRunning) {
          await invoke("stop_action");
        }
        setError(null);
        await invoke("start_action", { settings: buildPayload(config) });
        setRunningId(config.id);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setTimeout(() => { toggleBusy.current = false; }, 300);
    }
  }, [runningIdRef]);

  const clearError = useCallback(() => setError(null), []);

  return {
    runningId,
    error,
    startConfig,
    stopCurrent,
    toggleConfig,
    clearError,
  };
}

export { ActionControlContext };

/**
 * Consumer hook — use in any child route.
 */
export function useActionControl(): ActionControlState {
  const ctx = useContext(ActionControlContext);
  if (!ctx) throw new Error("useActionControl must be used within ActionControlContext.Provider");
  return ctx;
}
