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
      <div className="p-6 max-w-3xl mx-auto space-y-5">
        <div className="flex items-center gap-4">
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => navigate({ to: "/" })}
          >
            <ArrowLeft className="size-5" />
          </Button>
          <p className="text-base text-muted-foreground">Setup not found</p>
        </div>
      </div>
    );
  }

  const isRunning = actions.runningId === config.id;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => navigate({ to: "/" })}
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h2 className="text-base font-bold tracking-widest uppercase text-muted-foreground">
              Edit Setup
            </h2>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {config.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            className="gap-2 text-muted-foreground hover:text-destructive"
            onClick={() => {
              if (isRunning) actions.stopCurrent();
              deleteConfig(qc, config.id);
              navigate({ to: "/" });
            }}
          >
            <Trash2 className="size-5" />
            Delete
          </Button>
          <Button
            variant="secondary"
            className="gap-2"
            onClick={() => navigate({ to: "/" })}
          >
            <Save className="size-5" />
            Done
          </Button>
        </div>
      </div>

      {/* Status */}
      {isRunning ? (
        <div className="bg-destructive/15 border-2 border-destructive/50 text-destructive p-4 flex items-center justify-between animate-pulse">
          <span className="font-bold tracking-widest text-base uppercase">RUNNING</span>
          <button
            type="button"
            onClick={() => actions.stopCurrent()}
            className="text-sm font-bold uppercase tracking-wide hover:underline cursor-pointer"
          >
            Stop
          </button>
        </div>
      ) : null}

      {/* Form -- changes are saved immediately */}
      <ConfigForm
        config={config}
        onChange={(patch) => updateConfig(qc, config.id, patch)}
        disabled={isRunning}
      />
    </div>
  );
}
