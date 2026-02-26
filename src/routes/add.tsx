import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfigForm } from "@/components/ConfigForm";
import { addConfig } from "@/lib/queries";
import { createConfig } from "@/lib/store";
import type { InputConfig } from "@/types/settings";

export function AddPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<InputConfig>(() => createConfig({ name: "New Setup" }));

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
              New Setup
            </h2>
            <p className="text-[11px] text-muted-foreground/70 mt-0.5">
              Configure a new input automation
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="success"
          className="gap-1.5"
          onClick={() => {
            addConfig(qc, draft);
            navigate({ to: "/" });
          }}
        >
          <Save className="size-3.5" />
          Save & Add
        </Button>
      </div>

      {/* Form */}
      <ConfigForm
        config={draft}
        onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
      />
    </div>
  );
}
