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
