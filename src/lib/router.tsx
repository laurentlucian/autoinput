import {
  createRouter,
  createRoute,
  createRootRoute,
  createHashHistory,
  Outlet,
  Link,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pin, PinOff } from "lucide-react";
import { appStateQueryOptions, updateAppSettings } from "@/lib/queries";
import { useActionControlProvider, ActionControlContext } from "@/hooks/use-action-control";
import { useHotkeys } from "@/hooks/use-hotkeys";
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

  // Always-on-top
  useEffect(() => {
    if (state?.settings.alwaysOnTop !== undefined) {
      invoke("set_always_on_top", { enabled: state.settings.alwaysOnTop }).catch(() => {});
    }
  }, [state?.settings.alwaysOnTop]);

  const alwaysOnTop = state?.settings.alwaysOnTop ?? false;

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
              title={alwaysOnTop ? "Unpin window" : "Pin window on top"}
            >
              {alwaysOnTop ? <Pin className="size-4" /> : <PinOff className="size-4" />}
              {alwaysOnTop ? "PINNED" : "PIN"}
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
