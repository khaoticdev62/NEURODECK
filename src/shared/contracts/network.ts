import { z } from 'zod'

/**
 * Capability-detected network diagnostics for ND-045. Every field follows the
 * same `{ available, value?, source, reason? }` shape used by
 * `SystemMetricsService` so unavailable adapters are reported honestly.
 */
export interface NetworkMetricValue<T> {
  available: boolean
  value?: T
  source: string
  reason?: string
}

function networkMetricSchema<T extends z.ZodTypeAny>(
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

export const networkInterfaceSchema = z.object({
  name: z.string(),
  addressCount: z.number(),
  internal: z.boolean(),
  families: z.array(z.string())
})

export const networkConnectionSchema = z.object({
  name: z.string(),
  type: z.enum(['ethernet', 'wifi', 'loopback', 'other']),
  state: z.enum(['connected', 'disconnected', 'unknown'])
})

export const networkDiagnosticsSchema = z.object({
  interfaces: networkMetricSchema(z.array(networkInterfaceSchema)),
  connections: networkMetricSchema(z.array(networkConnectionSchema)),
  dns: networkMetricSchema(z.array(z.string())),
  proxy: networkMetricSchema(
    z.object({
      http: z.string().nullable(),
      https: z.string().nullable(),
      socks: z.string().nullable(),
      noProxy: z.string().nullable()
    })
  ),
  vpn: networkMetricSchema(z.array(z.object({ name: z.string(), status: z.string() }))),
  firewall: networkMetricSchema(z.object({ enabled: z.boolean() }))
})

export type NetworkDiagnostics = z.infer<typeof networkDiagnosticsSchema>
