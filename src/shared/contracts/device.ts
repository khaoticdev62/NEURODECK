import { z } from 'zod'

/**
 * Epic X1 Device Registry (supplemental spec §22) — the persisted record
 * shape and real CRUD only. Real detection backends (Bluetooth pairing,
 * audio device enumeration, display/dock detection, removable storage)
 * are Epic X8's job (Device and Peripheral Center) — this is the shared
 * store those backends will write real, detected records into, not a
 * source of fabricated device presence itself.
 */
export const deviceCategorySchema = z.enum([
  'bluetooth',
  'audio',
  'display',
  'storage',
  'controller',
  'other'
])
export type DeviceCategory = z.infer<typeof deviceCategorySchema>

export const deviceConnectionStateSchema = z.enum(['connected', 'disconnected', 'pairing', 'error'])
export type DeviceConnectionState = z.infer<typeof deviceConnectionStateSchema>

export const deviceRecordSchema = z.object({
  id: z.string().min(1),
  category: deviceCategorySchema,
  name: z.string().min(1).max(200),
  vendor: z.string().optional(),
  connectionState: deviceConnectionStateSchema,
  /** Real `CapabilityId`s this device depends on (e.g. a Bluetooth device depends on the `bluetooth` capability being `available`) — kept as plain strings here rather than importing `CapabilityId` to avoid a hard coupling between two registries that are independently consumable. */
  capabilityDependencies: z.array(z.string()).default([]),
  lastSeenAt: z.number().int().nonnegative(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative()
})
export type DeviceRecord = z.infer<typeof deviceRecordSchema>

export const upsertDeviceRequestSchema = deviceRecordSchema.omit({
  createdAt: true,
  updatedAt: true
})
export type UpsertDeviceRequest = z.infer<typeof upsertDeviceRequestSchema>

export const deviceIdRequestSchema = z.object({ id: z.string().min(1) })
export type DeviceIdRequest = z.infer<typeof deviceIdRequestSchema>

export const deviceInventoryCategorySchema = z.enum([
  'controller',
  'bluetooth-device',
  'audio-output',
  'microphone',
  'display',
  'dock',
  'storage',
  'network-adapter',
  'keyboard',
  'mouse',
  'camera',
  'headset',
  'usb-device',
  'other'
])
export type DeviceInventoryCategory = z.infer<typeof deviceInventoryCategorySchema>

export const deviceInventoryHealthSchema = z.enum([
  'healthy',
  'degraded',
  'unavailable',
  'unsupported',
  'unknown'
])
export type DeviceInventoryHealth = z.infer<typeof deviceInventoryHealthSchema>

export const deviceInventoryRecordSchema = z.object({
  id: z.string().min(1),
  category: deviceInventoryCategorySchema,
  name: z.string().min(1),
  type: z.string().min(1),
  connected: z.boolean(),
  batteryPercent: z.number().min(0).max(100).nullable().optional(),
  capabilityStatus: z.string().min(1),
  driverBackend: z.string().min(1),
  permissions: z.array(z.string()),
  health: deviceInventoryHealthSchema,
  lastEventAt: z.number().int().nonnegative(),
  source: z.enum(['persisted-registry', 'system-metrics', 'capability-registry']),
  detail: z.string().optional()
})
export type DeviceInventoryRecord = z.infer<typeof deviceInventoryRecordSchema>

export const deviceCapabilitySummarySchema = z.object({
  id: z.string().min(1),
  status: z.string().min(1),
  reason: z.string().min(1),
  provider: z.string().optional(),
  lastCheckedAt: z.number().int().nonnegative()
})
export type DeviceCapabilitySummary = z.infer<typeof deviceCapabilitySummarySchema>

export const deviceInventoryReportSchema = z.object({
  collectedAt: z.number().int().nonnegative(),
  deviceCount: z.number().int().nonnegative(),
  connectedCount: z.number().int().nonnegative(),
  categories: z.array(deviceInventoryCategorySchema),
  devices: z.array(deviceInventoryRecordSchema),
  capabilities: z.array(deviceCapabilitySummarySchema),
  hotPlug: z.object({
    available: z.boolean(),
    reason: z.string().min(1)
  })
})
export type DeviceInventoryReport = z.infer<typeof deviceInventoryReportSchema>
