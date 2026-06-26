import type { Persona, UpsertPersonaRequest } from '@shared/contracts'
import { JsonStore } from '../persistence/JsonStore'

interface PersonaIndex {
  personas: Persona[]
}

/** Real Epic X4 Persona library persistence (supplemental §14.2), mirroring `ApplicationStore`'s shape. The schema itself has no permission-affecting field — see `shared/contracts/promptLibrary.ts`. */
export class PersonaStore {
  private readonly store: JsonStore<PersonaIndex>

  constructor(filePath: string) {
    this.store = new JsonStore<PersonaIndex>(filePath, { personas: [] })
  }

  async list(): Promise<Persona[]> {
    const index = await this.store.read()
    return index.personas
  }

  async upsert(request: UpsertPersonaRequest): Promise<Persona> {
    const now = Date.now()
    const index = await this.store.read()
    const existing = index.personas.find((persona) => persona.id === request.id)
    const record: Persona = { ...request, createdAt: existing?.createdAt ?? now, updatedAt: now }
    const personas = existing
      ? index.personas.map((persona) => (persona.id === request.id ? record : persona))
      : [...index.personas, record]
    await this.store.write({ personas })
    return record
  }

  async remove(id: string): Promise<boolean> {
    const index = await this.store.read()
    const next = index.personas.filter((persona) => persona.id !== id)
    if (next.length === index.personas.length) return false
    await this.store.write({ personas: next })
    return true
  }
}
