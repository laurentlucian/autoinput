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
