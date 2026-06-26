import { join } from 'node:path'
import { JsonStore } from '../persistence/JsonStore'

/**
 * Real backing store for the `store-extension-data` capability
 * (supplemental §9.4 "Store extension-scoped data"). Each extension
 * gets its own real JSON file, namespaced by id under `directory` —
 * never a shared file multiple extensions could read each other's data
 * from, and `clear()` (supplemental §9.5 "Clear extension data") really
 * deletes that extension's data by resetting its own file, not a
 * cosmetic flag.
 */
export class ExtensionDataStore {
  constructor(private readonly directory: string) {}

  private storeFor(extensionId: string): JsonStore<Record<string, unknown>> {
    return new JsonStore<Record<string, unknown>>(
      join(this.directory, `${encodeURIComponent(extensionId)}.json`),
      {}
    )
  }

  async get(extensionId: string, key: string): Promise<unknown> {
    const data = await this.storeFor(extensionId).read()
    return data[key]
  }

  async set(extensionId: string, key: string, value: unknown): Promise<void> {
    const store = this.storeFor(extensionId)
    const data = await store.read()
    await store.write({ ...data, [key]: value })
  }

  async clear(extensionId: string): Promise<void> {
    await this.storeFor(extensionId).write({})
  }
}
