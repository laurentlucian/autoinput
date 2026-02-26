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
              New Setup
            </h2>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Configure a new input automation
            </p>
          </div>
        </div>
        <Button
          variant="success"
          className="gap-2"
          onClick={() => {
            addConfig(qc, draft);
            navigate({ to: "/" });
          }}
        >
          <Save className="size-5" />
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
