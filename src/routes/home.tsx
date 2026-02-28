import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Plus, Square, Pencil, Trash2, Mouse, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KeyCapture } from "@/components/KeyCapture";
import { appStateQueryOptions, deleteConfig, updateConfig } from "@/lib/queries";
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
      <div className="p-6 max-w-4xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="w-20 h-4 bg-muted/40 rounded-sm animate-pulse" />
            <div className="w-36 h-3 bg-muted/30 rounded-sm animate-pulse" />
          </div>
          <div className="w-28 h-9 bg-muted/40 rounded-sm animate-pulse" />
        </div>
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
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold tracking-widest uppercase text-muted-foreground">
            Setups
          </h2>
          <p className="text-sm text-muted-foreground/70 mt-1">
            {configs.length === 0
              ? "Add your first input automation setup"
              : `${configs.length} setup${configs.length !== 1 ? "s" : ""} configured`}
          </p>
        </div>
        <Link to="/add">
          <Button variant="outline" className="gap-2">
            <Plus className="size-5" />
            Add Setup
          </Button>
        </Link>
      </div>

      {/* Status banner */}
      {actions.runningId ? (
        <div className="bg-destructive/15 border-2 border-destructive/50 text-destructive p-4 flex items-center justify-between">
          <span className="font-bold tracking-widest text-base uppercase">
            Running: {configs.find((c) => c.id === actions.runningId)?.name ?? "Unknown"}
          </span>
          <button
            type="button"
            onClick={() => actions.stopCurrent()}
            className="text-sm font-bold uppercase tracking-wide hover:underline cursor-pointer"
          >
            Stop
          </button>
        </div>
      ) : null}

      {/* Error banner */}
      {actions.error ? (
        <div className="bg-destructive/10 border-2 border-destructive/30 text-destructive p-4 flex items-center justify-between gap-3">
          <span className="text-sm">{actions.error}</span>
          <button
            type="button"
            onClick={() => actions.clearError()}
            className="shrink-0 text-sm font-bold uppercase tracking-wide hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {/* Config list */}
      {configs.length === 0 ? (
        <div className="border-2 border-dashed border-border p-10 text-center space-y-4">
          <p className="text-lg text-muted-foreground font-medium">No setups yet</p>
          <p className="text-sm text-muted-foreground/60">
            Click "Add Setup" to create your first mouse or keyboard automation
          </p>
          <Link to="/add">
            <Button variant="secondary" className="gap-2 mt-3">
              <Plus className="size-5" />
              Create First Setup
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {configs.map((config) => {
            const isRunning = actions.runningId === config.id;
            return (
              <div
                key={config.id}
                className={`border-2 p-4 flex items-center gap-5 transition-all ${
                  isRunning
                    ? "border-destructive/50 bg-destructive/[0.05]"
                    : "border-border hover:border-primary/40"
                }`}
              >
                {/* Icon */}
                <div className="shrink-0 flex items-center justify-center w-12 h-12 border-2 border-border bg-muted/30">
                  {config.actionType === "click" ? (
                    <Mouse className="size-6 text-muted-foreground" />
                  ) : (
                    <Keyboard className="size-6 text-muted-foreground" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <p className="text-base font-bold truncate">{config.name}</p>
                    {isRunning ? (
                      <span className="text-sm uppercase tracking-widest text-destructive font-bold animate-pulse shrink-0">
                        Running
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-sm text-muted-foreground">
                      {configSummary(config)}
                    </span>
                    <span className="text-sm text-muted-foreground/40">|</span>
                    <span className="text-sm text-muted-foreground">
                      {config.repeatMode === "infinite" ? "Infinite" : `${config.repeatCount}x`}
                    </span>
                    <span className="text-sm text-muted-foreground/40">|</span>
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {intervalSummary(config)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="shrink-0 flex items-center gap-2">
                  {isRunning ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="gap-2"
                      onClick={() => actions.stopCurrent()}
                    >
                      <Square className="size-4" />
                      Stop
                    </Button>
                  ) : null}

                  {/* Toggle hotkey */}
                  <div className="w-20">
                    <KeyCapture
                      value={config.hotkeys.toggle}
                      clearable
                      onChange={(key) =>
                        updateConfig(qc, config.id, {
                          hotkeys: { ...config.hotkeys, toggle: key },
                        })
                      }
                    />
                  </div>

                  <Link to="/edit/$configId" params={{ configId: config.id }}>
                    <Button size="icon-sm" variant="ghost">
                      <Pencil className="size-4" />
                    </Button>
                  </Link>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      if (isRunning) actions.stopCurrent();
                      deleteConfig(qc, config.id);
                    }}
                  >
                    <Trash2 className="size-4" />
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
