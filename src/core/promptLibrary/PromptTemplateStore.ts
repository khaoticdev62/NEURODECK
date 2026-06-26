import type { PromptTemplate, UpsertPromptTemplateRequest } from '@shared/contracts'
import { JsonStore } from '../persistence/JsonStore'

interface PromptTemplateIndex {
  templates: PromptTemplate[]
}

/** Real Epic X4 Prompt Template library persistence (supplemental §14.1), mirroring `ApplicationStore`'s shape. */
export class PromptTemplateStore {
  private readonly store: JsonStore<PromptTemplateIndex>

  constructor(filePath: string) {
    this.store = new JsonStore<PromptTemplateIndex>(filePath, { templates: [] })
  }

  async list(): Promise<PromptTemplate[]> {
    const index = await this.store.read()
    return index.templates
  }

  async upsert(request: UpsertPromptTemplateRequest): Promise<PromptTemplate> {
    const now = Date.now()
    const index = await this.store.read()
    const existing = index.templates.find((template) => template.id === request.id)
    const record: PromptTemplate = {
      ...request,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    }
    const templates = existing
      ? index.templates.map((template) => (template.id === request.id ? record : template))
      : [...index.templates, record]
    await this.store.write({ templates })
    return record
  }

  async remove(id: string): Promise<boolean> {
    const index = await this.store.read()
    const next = index.templates.filter((template) => template.id !== id)
    if (next.length === index.templates.length) return false
    await this.store.write({ templates: next })
    return true
  }
}
