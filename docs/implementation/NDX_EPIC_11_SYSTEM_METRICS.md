# Epic 11: System Metrics Core

## Scope

This sprint item adds the read-only system metrics foundation required by the Epic 11 dashboard. It does not expose IPC endpoints or add dashboard UI yet.

## Delivered

- Capability-driven snapshots with explicit available/unavailable states.
- Core process identity and uptime.
- CPU utilization, logical core count, and processor model.
- Physical memory usage.
- Storage capacity and free-space metrics.
- Linux swap, battery, thermal, fan, GPU utilization, and process metrics from procfs/sysfs when available.
- Network-interface summaries without exposing IP or MAC addresses.
- Dependency injection for deterministic tests.

Unsupported or inaccessible sensors return an unavailable value with a reason. The service never invents fallback measurements.

## Safety and privacy

- The service is read-only and cannot terminate processes or modify system settings.
- Network output contains interface names, address-family counts, and internal/external classification only.
- Process collection is capped at 256 entries.
- Sensor values are normalized and bounded before exposure.
- Filesystem failures are isolated per capability so one missing sensor does not fail the complete snapshot.

## Verification

- Real-host smoke coverage for CPU, memory, storage, and core process metrics.
- Deterministic Linux fixture coverage for swap, battery, thermal, fan, GPU, and process metrics.
- Unit coverage for CPU delta calculation and `/proc/meminfo` parsing.
- `npm run typecheck`
- `npm run lint`
- `npm run test -- src/core/system/__tests__/SystemMetricsService.test.ts`

## Remaining Epic 11 work

- Define the shared metrics contract and IPC handler.
- Wire the preload client.
- Build ND-042 System Dashboard using the existing visual system and project screenshot references.
- Add user-service and model-runtime status sources.
- Add performance profiles and any privileged controls behind explicit authorization boundaries.
- Complete the remaining diagnostics, storage, cache, log, and recovery screens.

The shared IPC, route, and implementation-ledger files were intentionally left untouched because another active workstream currently modifies them.
