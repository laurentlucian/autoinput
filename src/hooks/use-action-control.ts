import { useState, useCallback, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { ActionType, Settings } from "@/types/settings";
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
  holdKey: string;
  keyMode: string;
}

function buildPayload(s: Settings, mode: ActionType): ActionPayload {
  return {
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
    mouseMode: s.mouseMode,
    holdKey: s.holdKey,
    keyMode: s.keyMode,
  };
}

/**
 * Manages the running state and provides start/stop/toggle operations
 * for both click and key-hold action modes.
 *
 * Listens for the backend "action-stopped" event (e.g. when count mode completes).
 */
export function useActionControl(settings: Settings) {
  const [running, setRunning] = useState(false);
  const [runningMode, setRunningMode] = useState<ActionType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const settingsRef = useLatest(settings);
  const runningRef = useLatest(running);
  const runningModeRef = useLatest(runningMode);
  const toggleBusy = useRef(false);

  // Listen for backend "action-stopped" event (count mode completion)
  useEffect(() => {
    const unlisten = listen("action-stopped", () => {
      setRunning(false);
      setRunningMode(null);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const startMode = useCallback(async (mode: ActionType) => {
    setError(null);
    try {
      if (runningRef.current) {
        await invoke("stop_action");
      }
      await invoke("start_action", {
        settings: buildPayload(settingsRef.current, mode),
      });
      setRunning(true);
      setRunningMode(mode);
    } catch (err) {
      setError(String(err));
    }
  }, [runningRef, settingsRef]);

  const stopCurrent = useCallback(async () => {
    if (!runningRef.current) return;
    try {
      await invoke("stop_action");
    } catch (err) {
      setError(String(err));
    }
    setRunning(false);
    setRunningMode(null);
  }, [runningRef]);

  const toggleMode = useCallback(async (mode: ActionType) => {
    if (toggleBusy.current) return;
    toggleBusy.current = true;

    try {
      const backendRunning = await invoke<boolean>("is_running");
      const currentMode = runningModeRef.current;

      if (backendRunning && currentMode === mode) {
        await invoke("stop_action");
        setRunning(false);
        setRunningMode(null);
      } else {
        if (backendRunning) {
          await invoke("stop_action");
        }
        setError(null);
        await invoke("start_action", {
          settings: buildPayload(settingsRef.current, mode),
        });
        setRunning(true);
        setRunningMode(mode);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setTimeout(() => { toggleBusy.current = false; }, 300);
    }
  }, [runningModeRef, settingsRef]);

  // Shared-mode wrappers that use activeMode from settings
  const startAction = useCallback(
    () => startMode(settingsRef.current.activeMode),
    [startMode, settingsRef],
  );

  const stopAction = useCallback(
    () => stopCurrent(),
    [stopCurrent],
  );

  const toggleAction = useCallback(
    () => toggleMode(settingsRef.current.activeMode),
    [toggleMode, settingsRef],
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    running,
    runningMode,
    error,
    startMode,
    stopCurrent,
    toggleMode,
    startAction,
    stopAction,
    toggleAction,
    clearError,
  } as const;
}
