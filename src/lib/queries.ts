import { queryOptions, type QueryClient } from "@tanstack/react-query";
import type { InputConfig, AppState, AppSettings } from "@/types/settings";
import { loadAppState, saveAppState, createConfig } from "@/lib/store";

// ---------------------------------------------------------------------------
// Query key & options
// ---------------------------------------------------------------------------

export const appStateQueryKey = ["appState"] as const;

export const appStateQueryOptions = queryOptions({
  queryKey: appStateQueryKey,
  queryFn: loadAppState,
  staleTime: Infinity, // We manage cache manually
});

// ---------------------------------------------------------------------------
// Mutation helpers — imperative functions that update cache + persist
// ---------------------------------------------------------------------------

function updateState(qc: QueryClient, updater: (prev: AppState) => AppState) {
  const prev = qc.getQueryData<AppState>(appStateQueryKey);
  if (!prev) return;
  const next = updater(prev);
  qc.setQueryData(appStateQueryKey, next);
  saveAppState(next);
}

export function addConfig(qc: QueryClient, overrides: Partial<InputConfig> = {}) {
  const config = createConfig(overrides);
  updateState(qc, (prev) => ({
    ...prev,
    configs: [...prev.configs, config],
  }));
  return config;
}

export function updateConfig(qc: QueryClient, id: string, patch: Partial<InputConfig>) {
  updateState(qc, (prev) => ({
    ...prev,
    configs: prev.configs.map((c) => (c.id === id ? { ...c, ...patch } : c)),
  }));
}

export function deleteConfig(qc: QueryClient, id: string) {
  updateState(qc, (prev) => ({
    ...prev,
    configs: prev.configs.filter((c) => c.id !== id),
  }));
}

export function reorderConfigs(qc: QueryClient, configs: InputConfig[]) {
  updateState(qc, (prev) => ({ ...prev, configs }));
}

export function updateAppSettings(qc: QueryClient, patch: Partial<AppSettings>) {
  updateState(qc, (prev) => ({
    ...prev,
    settings: { ...prev.settings, ...patch },
  }));
}
