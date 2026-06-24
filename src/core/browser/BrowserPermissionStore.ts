import type { BrowserPermission } from '@shared/contracts/browser'
import { JsonStore } from '../persistence/JsonStore'

interface BrowserPermissionIndex {
  permissions: BrowserPermission[]
}

export class BrowserPermissionStore {
  private readonly store: JsonStore<BrowserPermissionIndex>

  constructor(filePath: string) {
    this.store = new JsonStore<BrowserPermissionIndex>(filePath, { permissions: [] })
  }

  async list(): Promise<BrowserPermission[]> {
    const index = await this.store.read()
    return index.permissions
  }

  async get(origin: string, permission: string): Promise<BrowserPermission | undefined> {
    const index = await this.store.read()
    return index.permissions.find((p) => p.origin === origin && p.permission === permission)
  }

  async set(origin: string, permission: string, granted: boolean): Promise<BrowserPermission> {
    const now = Date.now()
    const index = await this.store.read()
    const existing = index.permissions.find(
      (p) => p.origin === origin && p.permission === permission
    )
    const entry: BrowserPermission = {
      origin,
      permission,
      granted,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    }
    const permissions = existing
      ? index.permissions.map((p) =>
          p.origin === origin && p.permission === permission ? entry : p
        )
      : [...index.permissions, entry]
    await this.store.write({ permissions })
    return entry
  }

  async remove(origin: string, permission: string): Promise<boolean> {
    const index = await this.store.read()
    const next = index.permissions.filter(
      (p) => !(p.origin === origin && p.permission === permission)
    )
    if (next.length === index.permissions.length) return false
    await this.store.write({ permissions: next })
    return true
  }
}
