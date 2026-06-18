import type { ProviderRuntimeProfile } from "../../shared/contracts/models.contracts";

export function describeRuntime(runtime: ProviderRuntimeProfile): string {
  const parts: string[] = [];
  if (runtime.baseUrl) parts.push(runtime.baseUrl);
  const caps = Object.entries(runtime.supports)
    .filter(([, v]) => v)
    .map(([k]) => k.replace(/([A-Z])/g, " $1").toLowerCase());
  if (caps.length) parts.push(`supports ${caps.slice(0, 3).join(", ")}`);
  return parts.length ? parts.join(" · ") : runtime.label;
}
