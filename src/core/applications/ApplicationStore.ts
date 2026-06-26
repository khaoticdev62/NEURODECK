import type { ApplicationRecord, UpsertApplicationRequest } from '@shared/contracts'
import { JsonStore } from '../persistence/JsonStore'

interface ApplicationIndex {
  applications: ApplicationRecord[]
}

/**
 * Epic X1 Application Registry (supplemental spec §6.2) — real persisted
 * CRUD only. Multi-source discovery (Steam library, desktop entries,
 * Flatpak, AppImage, system packages) is Epic X2's job; this store is
 * the shared destination every real discovery adapter will write
 * verified records into, mirroring `BrowserPermissionStore`'s shape.
 */
export class ApplicationStore {
  private readonly store: JsonStore<ApplicationIndex>

  constructor(filePath: string) {
    this.store = new JsonStore<ApplicationIndex>(filePath, { applications: [] })
  }

  async list(): Promise<ApplicationRecord[]> {
    const index = await this.store.read()
    return index.applications
  }

  async get(id: string): Promise<ApplicationRecord | undefined> {
    const index = await this.store.read()
    return index.applications.find((application) => application.id === id)
  }

  async upsert(request: UpsertApplicationRequest): Promise<ApplicationRecord> {
    const now = Date.now()
    const index = await this.store.read()
    const existing = index.applications.find((application) => application.id === request.id)
    const record: ApplicationRecord = {
      ...request,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    }
    const applications = existing
      ? index.applications.map((application) =>
          application.id === request.id ? record : application
        )
      : [...index.applications, record]
    await this.store.write({ applications })
    return record
  }

  async remove(id: string): Promise<boolean> {
    const index = await this.store.read()
    const next = index.applications.filter((application) => application.id !== id)
    if (next.length === index.applications.length) return false
    await this.store.write({ applications: next })
    return true
  }
}
