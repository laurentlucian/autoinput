import {
  createRouter,
  createRoute,
  createRootRoute,
  createHashHistory,
  Outlet,
  Link,
} from "@tanstack/react-router";
import { useEffect, useState, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pin, PinOff } from "lucide-react";
import { appStateQueryOptions, updateAppSettings } from "@/lib/queries";
import { useActionControlProvider, ActionControlContext } from "@/hooks/use-action-control";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { CompactDot } from "@/components/CompactDot";
import { HomePage } from "@/routes/home";
import { AddPage } from "@/routes/add";
import { EditPage } from "@/routes/edit";

// ---------------------------------------------------------------------------
// Root layout
// ---------------------------------------------------------------------------

function RootLayout() {
  const qc = useQueryClient();
  const { data: state } = useQuery(appStateQueryOptions);
  const actions = useActionControlProvider();

  // Register hotkeys for all configs
  useHotkeys(state?.configs ?? [], actions);

  const alwaysOnTop = state?.settings.alwaysOnTop ?? false;
  const configs = state?.configs ?? [];

  // ---- Compact mode state ----
  const [isCompact, setIsCompact] = useState(false);
  const savedSizeRef = useRef<[number, number] | null>(null);
  const transitioningRef = useRef(false);

  // Determine which config is running (for the tooltip)
  const runningConfig = actions.runningId
    ? configs.find((c) => c.id === actions.runningId)
    : undefined;

  // Check if any config has hotkeys set
  const hasAnyHotkeys = configs.some(
    (c) => c.hotkeys.start || c.hotkeys.stop || c.hotkeys.toggle
  );

  // ---- Enter compact mode ----
  const enterCompact = useCallback(async () => {
    if (transitioningRef.current || isCompact) return;
    transitioningRef.current = true;
    try {
      const prev = await invoke<[number, number]>("enter_compact_mode");
      savedSizeRef.current = prev;
      setIsCompact(true);
    } catch {
      // Failed to enter compact mode, ignore
    } finally {
      transitioningRef.current = false;
    }
  }, [isCompact]);

  // ---- Exit compact mode ----
  const exitCompact = useCallback(async () => {
    if (transitioningRef.current || !isCompact) return;
    transitioningRef.current = true;
    try {
      const [w, h] = savedSizeRef.current ?? [900, 700];
      await invoke("exit_compact_mode", { width: w, height: h });
      savedSizeRef.current = null;
      setIsCompact(false);
      // Also unpin the setting
      updateAppSettings(qc, { alwaysOnTop: false });
    } catch {
      // Failed to exit compact mode, ignore
    } finally {
      transitioningRef.current = false;
    }
  }, [isCompact, qc]);

  // ---- Effect: alwaysOnTop is "armed" — enter compact when running + has hotkeys ----
  // While idle, the window is NOT pinned on top — pin is just armed, waiting.
  useEffect(() => {
    if (!alwaysOnTop || isCompact) return;

    if (actions.runningId && hasAnyHotkeys) {
      // Running + has hotkeys → go compact
      enterCompact();
    }
    // Idle or no hotkeys → do NOT pin the window, just keep the setting armed
  }, [alwaysOnTop, actions.runningId, hasAnyHotkeys, isCompact, enterCompact]);

  // ---- Effect: action stopped while in compact → exit compact ----
  useEffect(() => {
    if (isCompact && !actions.runningId) {
      exitCompact();
    }
  }, [isCompact, actions.runningId, exitCompact]);

  // ---- Effect: when pin is disarmed, ensure window is not always-on-top ----
  useEffect(() => {
    if (!isCompact && !alwaysOnTop) {
      invoke("set_always_on_top", { enabled: false }).catch(() => {});
    }
  }, [isCompact, alwaysOnTop]);

  // ---- Compact mode render ----
  if (isCompact) {
    return (
      <ActionControlContext.Provider value={actions}>
        <CompactDot config={runningConfig} />
      </ActionControlContext.Provider>
    );
  }

  // ---- Full mode render ----
  return (
    <ActionControlContext.Provider value={actions}>
      <main className="h-screen bg-background flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0" data-tauri-drag-region>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-xl font-black tracking-widest text-primary hover:text-primary/80 transition-colors">
              AUTOINPUT
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {actions.runningId ? (
              <span className="text-sm uppercase tracking-widest text-destructive font-bold animate-pulse">
                RUNNING
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => updateAppSettings(qc, { alwaysOnTop: !alwaysOnTop })}
              className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors uppercase tracking-wide font-medium"
              title={alwaysOnTop ? "Disarm compact mode" : "Arm compact mode — shrinks to dot when running"}
            >
              {alwaysOnTop ? <Pin className="size-4" /> : <PinOff className="size-4" />}
              {alwaysOnTop ? "ARMED" : "PIN"}
            </button>
          </div>
        </header>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </ActionControlContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

const addRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/add",
  component: AddPage,
});

const editRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/edit/$configId",
  component: EditPage,
});

const routeTree = rootRoute.addChildren([indexRoute, addRoute, editRoute]);

// Use hash history for Tauri (file:// protocol)
const hashHistory = createHashHistory();

export const router = createRouter({
  routeTree,
  history: hashHistory,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
