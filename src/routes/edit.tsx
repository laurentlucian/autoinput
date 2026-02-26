import { useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfigForm } from "@/components/ConfigForm";
import { appStateQueryOptions, updateConfig, deleteConfig } from "@/lib/queries";
import { useActionControl } from "@/hooks/use-action-control";

export function EditPage() {
  const { configId } = useParams({ from: "/edit/$configId" });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: state } = useQuery(appStateQueryOptions);
  const actions = useActionControl();

  const config = state?.configs.find((c) => c.id === configId);

  if (!config) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => navigate({ to: "/" })}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <p className="text-sm text-muted-foreground">Setup not found</p>
        </div>
      </div>
    );
  }

  const isRunning = actions.runningId === config.id;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => navigate({ to: "/" })}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
              Edit Setup
            </h2>
            <p className="text-[11px] text-muted-foreground/70 mt-0.5">
              {config.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 text-muted-foreground hover:text-destructive"
            onClick={() => {
              if (isRunning) actions.stopCurrent();
              deleteConfig(qc, config.id);
              navigate({ to: "/" });
            }}
          >
            <Trash2 className="size-3.5" />
            Delete
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="gap-1.5"
            onClick={() => navigate({ to: "/" })}
          >
            <Save className="size-3.5" />
            Done
          </Button>
        </div>
      </div>

      {/* Status */}
      {isRunning ? (
        <div className="bg-destructive/15 border border-destructive/40 text-destructive text-xs p-2.5 flex items-center justify-between animate-pulse">
          <span className="font-medium tracking-wide">RUNNING</span>
          <button
            type="button"
            onClick={() => actions.stopCurrent()}
            className="text-[10px] font-medium uppercase hover:underline cursor-pointer"
          >
            Stop
          </button>
        </div>
      ) : null}

      {/* Form — changes are saved immediately */}
      <ConfigForm
        config={config}
        onChange={(patch) => updateConfig(qc, config.id, patch)}
        disabled={isRunning}
        isRunning={isRunning}
      />
    </div>
  );
}
