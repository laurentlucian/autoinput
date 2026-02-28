import {
  createRouter,
  createRoute,
  createRootRoute,
  createHashHistory,
  Outlet,
  Link,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { appStateQueryOptions } from "@/lib/queries";
import { useActionControlProvider, ActionControlContext } from "@/hooks/use-action-control";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { HomePage } from "@/routes/home";
import { AddPage } from "@/routes/add";
import { EditPage } from "@/routes/edit";

// ---------------------------------------------------------------------------
// Root layout
// ---------------------------------------------------------------------------

function RootLayout() {
  const { data: state } = useQuery(appStateQueryOptions);
  const actions = useActionControlProvider();

  // Register hotkeys for all configs
  useHotkeys(state?.configs ?? [], actions);

  // ---- Skeleton shown while app state loads ----
  if (!state) {
    return (
      <main className="h-screen bg-background flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0" data-tauri-drag-region>
          <span className="text-xl font-black tracking-widest text-primary">AUTOINPUT</span>
          <div className="w-16 h-5 bg-muted/40 rounded-sm animate-pulse" />
        </header>
        <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full space-y-5">
          {/* Heading skeleton */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="w-20 h-4 bg-muted/40 rounded-sm animate-pulse" />
              <div className="w-36 h-3 bg-muted/30 rounded-sm animate-pulse" />
            </div>
            <div className="w-28 h-9 bg-muted/40 rounded-sm animate-pulse" />
          </div>
          {/* Card skeletons */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="border-2 border-border p-4 flex items-center gap-5">
              <div className="w-12 h-12 border-2 border-border bg-muted/30 shrink-0 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="w-32 h-4 bg-muted/40 rounded-sm animate-pulse" />
                <div className="w-48 h-3 bg-muted/30 rounded-sm animate-pulse" />
              </div>
              <div className="flex items-center gap-2">
                <div className="w-20 h-8 bg-muted/30 rounded-sm animate-pulse" />
                <div className="w-8 h-8 bg-muted/30 rounded-sm animate-pulse" />
                <div className="w-8 h-8 bg-muted/30 rounded-sm animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </main>
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
          <div className="flex items-center gap-4" />
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
