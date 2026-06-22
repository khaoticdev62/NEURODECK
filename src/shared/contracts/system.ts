import { z } from 'zod'

/**
 * Mirrors `core/system/SystemMetricsService.ts`'s real, capability-detected
 * snapshot shape (mega-prompt §27). Every metric is `{ available, value?,
 * source, reason? }` so an unavailable sensor (no battery, non-Linux host,
 * permission-denied sysfs path) is represented honestly rather than
 * fabricated or zero-filled.
 */
export interface MetricValue<T> {
  available: boolean
  value?: T
  source: string
  reason?: string
}

function metricValueSchema<T extends z.ZodTypeAny>(
  value: T
): z.ZodObject<{
  available: z.ZodBoolean
  value: z.ZodOptional<T>
  source: z.ZodString
  reason: z.ZodOptional<z.ZodString>
}> {
  return z.object({
    available: z.boolean(),
    value: value.optional(),
    source: z.string(),
    reason: z.string().optional()
  })
}

export const cpuMetricsSchema = z.object({
  usagePercent: z.number(),
  logicalCores: z.number(),
  model: z.string()
})

export const memoryMetricsSchema = z.object({
  totalBytes: z.number(),
  usedBytes: z.number(),
  availableBytes: z.number(),
  usagePercent: z.number()
})

export const storageMetricsSchema = z.object({
  path: z.string(),
  totalBytes: z.number(),
  usedBytes: z.number(),
  availableBytes: z.number(),
  usagePercent: z.number()
})

export const batteryMetricsSchema = z.object({
  name: z.string(),
  capacityPercent: z.number().nullable(),
  status: z.string().nullable(),
  energyNowMicrowattHours: z.number().nullable(),
  energyFullMicrowattHours: z.number().nullable(),
  powerNowMicrowatts: z.number().nullable()
})

export const temperatureSensorSchema = z.object({ name: z.string(), celsius: z.number() })
export const fanSensorSchema = z.object({ name: z.string(), rpm: z.number() })
export const gpuMetricsSchema = z.object({ device: z.string(), usagePercent: z.number() })
export const networkInterfaceSummarySchema = z.object({
  name: z.string(),
  addressCount: z.number(),
  internal: z.boolean(),
  families: z.array(z.string())
})
export const processSummarySchema = z.object({
  pid: z.number(),
  name: z.string(),
  residentBytes: z.number().nullable()
})

export const systemMetricsSnapshotSchema = z.object({
  collectedAt: z.number(),
  hostPlatform: z.string(),
  core: z.object({ pid: z.number(), uptimeSeconds: z.number() }),
  cpu: metricValueSchema(cpuMetricsSchema),
  memory: metricValueSchema(memoryMetricsSchema),
  swap: metricValueSchema(memoryMetricsSchema),
  storage: metricValueSchema(storageMetricsSchema),
  battery: metricValueSchema(z.array(batteryMetricsSchema)),
  thermal: metricValueSchema(z.array(temperatureSensorSchema)),
  fans: metricValueSchema(z.array(fanSensorSchema)),
  gpu: metricValueSchema(z.array(gpuMetricsSchema)),
  network: metricValueSchema(z.array(networkInterfaceSummarySchema)),
  processes: metricValueSchema(z.array(processSummarySchema))
})
export type SystemMetricsSnapshot = z.infer<typeof systemMetricsSnapshotSchema>
