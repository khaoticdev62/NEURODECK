import { useEffect, useState, useCallback } from "react";
import { neurodeckApi, runtimeTypeToProvider } from "../../../services/bridgeAdapter";
import type { ProviderRuntimeProfile } from "../../../shared/contracts/models.contracts";
import { OFFLINE_PROVIDER, type ProviderOption } from "../types";
import { describeRuntime } from "../utils";

export function useProviderOptions() {
  const [providerOptions, setProviderOptions] = useState<ProviderOption[]>([OFFLINE_PROVIDER]);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [providersError, setProvidersError] = useState<string | null>(null);
  const [providerRetryCount, setProviderRetryCount] = useState(0);

  const retryProviders = useCallback(() => {
    setProviderRetryCount((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setProvidersLoading(true);
        setProvidersError(null);
        const runtimes = await neurodeckApi.models.listProviderRuntimes();
        const seen = new Set<string>(["offline-draft"]);
        const options: ProviderOption[] = [OFFLINE_PROVIDER];
        for (const runtime of runtimes) {
          const id = runtimeTypeToProvider(runtime.type);
          if (seen.has(id)) continue;
          seen.add(id);
          options.push({
            id,
            runtimeId: runtime.id,
            label: runtime.label || id,
            description: describeRuntime(runtime as ProviderRuntimeProfile),
          });
        }
        if (!cancelled) setProviderOptions(options);
      } catch (e) {
        if (!cancelled) {
          setProvidersError(String(e));
          setProviderOptions([OFFLINE_PROVIDER]);
        }
      } finally {
        if (!cancelled) setProvidersLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [providerRetryCount]);

  return {
    providerOptions,
    providersLoading,
    providersError,
    providerRetryCount,
    retryProviders,
  };
}
