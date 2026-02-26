import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Plus, Play, Square, Repeat, Pencil, Trash2, Mouse, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { appStateQueryOptions, deleteConfig } from "@/lib/queries";
import { useActionControl } from "@/hooks/use-action-control";
import type { InputConfig } from "@/types/settings";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function configSummary(c: InputConfig): string {
  if (c.actionType === "click") {
    const mode = c.mouseMode === "hold" ? "Hold" : c.clickType === "double" ? "Double Click" : "Click";
    return `${c.mouseButton.charAt(0).toUpperCase() + c.mouseButton.slice(1)} ${mode}`;
  }
  const mode = c.keyMode === "hold" ? "Hold" : "Repeat";
  return `${c.holdKey.toUpperCase()} ${mode}`;
}

function intervalSummary(c: InputConfig): string {
  const parts: string[] = [];
  if (c.hours > 0) parts.push(`${c.hours}h`);
  if (c.minutes > 0) parts.push(`${c.minutes}m`);
  if (c.seconds > 0) parts.push(`${c.seconds}s`);
  if (c.milliseconds > 0) parts.push(`${c.milliseconds}ms`);
  if (parts.length === 0) return "0ms";
  return parts.join(" ");
}

function hotkeySummary(c: InputConfig): string {
  const hk = c.hotkeys;
  const parts: string[] = [];
  if (hk.start) parts.push(hk.start);
  if (hk.toggle) parts.push(hk.toggle);
  return parts.length > 0 ? parts.join(" / ") : "No hotkeys";
}

// ---------------------------------------------------------------------------
// Home page
// ---------------------------------------------------------------------------

export function HomePage() {
  const qc = useQueryClient();
  const { data: state, isLoading } = useQuery(appStateQueryOptions);
  const actions = useActionControl();

  const configs = state?.configs ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Setups
          </h2>
          <p className="text-[11px] text-muted-foreground/70 mt-0.5">
            {configs.length === 0
              ? "Add your first input automation setup"
              : `${configs.length} setup${configs.length !== 1 ? "s" : ""} configured`}
          </p>
        </div>
        <Link to="/add">
          <Button size="sm" variant="outline" className="gap-1.5">
            <Plus className="size-3.5" />
            Add Setup
          </Button>
        </Link>
      </div>

      {/* Status banner */}
      {actions.runningId ? (
        <div className="bg-destructive/15 border border-destructive/40 text-destructive text-xs p-2.5 flex items-center justify-between animate-pulse">
          <span className="font-medium tracking-wide">
            RUNNING: {configs.find((c) => c.id === actions.runningId)?.name ?? "Unknown"}
          </span>
          <button
            type="button"
            onClick={() => actions.stopCurrent()}
            className="text-[10px] font-medium uppercase hover:underline cursor-pointer"
          >
            Stop
          </button>
        </div>
      ) : null}

      {/* Error banner */}
      {actions.error ? (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive text-xs p-2.5 flex items-center justify-between gap-2">
          <span>{actions.error}</span>
          <button
            type="button"
            onClick={() => actions.clearError()}
            className="shrink-0 text-[10px] font-medium uppercase hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {/* Config list */}
      {configs.length === 0 ? (
        <div className="border border-dashed border-border p-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">No setups yet</p>
          <p className="text-[11px] text-muted-foreground/60">
            Click "Add Setup" to create your first mouse or keyboard automation
          </p>
          <Link to="/add">
            <Button size="sm" variant="secondary" className="gap-1.5 mt-2">
              <Plus className="size-3.5" />
              Create First Setup
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-2">
          {configs.map((config) => {
            const isRunning = actions.runningId === config.id;
            return (
              <div
                key={config.id}
                className={`border p-3 flex items-center gap-4 transition-all ${
                  isRunning
                    ? "border-destructive/50 bg-destructive/[0.03]"
                    : "border-border hover:border-primary/30"
                }`}
              >
                {/* Icon */}
                <div className="shrink-0 flex items-center justify-center w-9 h-9 border border-border bg-muted/30">
                  {config.actionType === "click" ? (
                    <Mouse className="size-4 text-muted-foreground" />
                  ) : (
                    <Keyboard className="size-4 text-muted-foreground" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{config.name}</p>
                    {isRunning ? (
                      <span className="text-[10px] uppercase tracking-wider text-destructive font-medium animate-pulse shrink-0">
                        Running
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">
                      {configSummary(config)}
                    </span>
                    <span className="text-[10px] text-muted-foreground/50">|</span>
                    <span className="text-[10px] text-muted-foreground">
                      {config.repeatMode === "infinite" ? "Infinite" : `${config.repeatCount}x`}
                    </span>
                    <span className="text-[10px] text-muted-foreground/50">|</span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {intervalSummary(config)}
                    </span>
                    <span className="text-[10px] text-muted-foreground/50">|</span>
                    <span className="text-[10px] text-muted-foreground">
                      {hotkeySummary(config)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="shrink-0 flex items-center gap-1">
                  {isRunning ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="gap-1 h-7 px-2 text-[11px]"
                      onClick={() => actions.stopCurrent()}
                    >
                      <Square className="size-3" />
                      Stop
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="success"
                        className="gap-1 h-7 px-2 text-[11px]"
                        onClick={() => actions.startConfig(config)}
                        disabled={!!actions.runningId}
                      >
                        <Play className="size-3" />
                        Start
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 h-7 px-2 text-[11px]"
                        onClick={() => actions.toggleConfig(config)}
                      >
                        <Repeat className="size-3" />
                        Toggle
                      </Button>
                    </>
                  )}
                  <Link to="/edit/$configId" params={{ configId: config.id }}>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                      <Pencil className="size-3" />
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      if (isRunning) actions.stopCurrent();
                      deleteConfig(qc, config.id);
                    }}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
