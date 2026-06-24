import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import {
  curriculumProgressSchema,
  curriculumSchema,
  learningCatalogSchema,
  type CreateUserCurriculumRequest,
  type Curriculum,
  type CurriculumIdRequest,
  type CurriculumProgress,
  type UpdateProgressRequest,
  type UpdateUserCurriculumRequest
} from '@shared/contracts/learning'
import { JsonStore } from '../persistence/JsonStore'

export interface LearningServiceDependencies {
  userDataPath: string
  bundledCatalog: Curriculum[]
  generateId: () => string
  now: () => number
}

function emptyCatalog(): { curricula: Curriculum[] } {
  return { curricula: [] }
}
function emptyProgress(): { progress: CurriculumProgress } {
  return { progress: {} }
}

export class LearningService {
  private readonly userCurriculaStore: JsonStore<{ curricula: Curriculum[] }>
  private readonly progressStore: JsonStore<{ progress: CurriculumProgress }>

  constructor(private readonly deps: LearningServiceDependencies) {
    this.userCurriculaStore = new JsonStore(
      join(deps.userDataPath, 'learning', 'curricula.json'),
      emptyCatalog()
    )
    this.progressStore = new JsonStore(
      join(deps.userDataPath, 'learning', 'progress.json'),
      emptyProgress()
    )
  }

  async listCurricula(): Promise<Curriculum[]> {
    const user = await this.readUserCurricula()
    const bundled = this.deps.bundledCatalog.map((c) => ({ ...c, bundled: true }))
    const byId = new Map<string, Curriculum>()
    for (const curriculum of bundled) {
      byId.set(curriculum.id, curriculum)
    }
    for (const curriculum of user) {
      byId.set(curriculum.id, curriculum)
    }
    return Array.from(byId.values())
  }

  async getCurriculum(request: CurriculumIdRequest): Promise<Curriculum | null> {
    const curricula = await this.listCurricula()
    return curricula.find((c) => c.id === request.curriculumId) ?? null
  }

  async createUserCurriculum(request: CreateUserCurriculumRequest): Promise<Curriculum> {
    const curriculum: Curriculum = {
      ...request,
      id: `user:${this.deps.generateId()}`,
      bundled: false,
      createdAt: this.deps.now()
    }
    const parsed = curriculumSchema.parse(curriculum)
    const { curricula } = await this.userCurriculaStore.read()
    curricula.push(parsed)
    await this.userCurriculaStore.write({ curricula })
    return parsed
  }

  async updateUserCurriculum(request: UpdateUserCurriculumRequest): Promise<Curriculum | null> {
    if (this.deps.bundledCatalog.some((c) => c.id === request.id)) {
      throw new Error('Bundled curricula cannot be modified.')
    }
    const { curricula } = await this.userCurriculaStore.read()
    const index = curricula.findIndex((c) => c.id === request.id)
    if (index === -1) return null
    const existing = curricula[index]
    const updated = { ...existing, ...request }
    const parsed = curriculumSchema.parse(updated)
    curricula[index] = parsed
    await this.userCurriculaStore.write({ curricula })
    return parsed
  }

  async deleteUserCurriculum(request: CurriculumIdRequest): Promise<boolean> {
    if (this.deps.bundledCatalog.some((c) => c.id === request.curriculumId)) {
      throw new Error('Bundled curricula cannot be deleted.')
    }
    const { curricula } = await this.userCurriculaStore.read()
    const index = curricula.findIndex((c) => c.id === request.curriculumId)
    if (index === -1) return false
    curricula.splice(index, 1)
    await this.userCurriculaStore.write({ curricula })
    return true
  }

  async getProgress(): Promise<CurriculumProgress> {
    const { progress } = await this.progressStore.read()
    return curriculumProgressSchema.parse(progress)
  }

  async updateProgress(request: UpdateProgressRequest): Promise<CurriculumProgress> {
    const { progress } = await this.progressStore.read()
    const curriculumProgress = progress[request.curriculumId] ?? {}
    const moduleProgress = curriculumProgress[request.moduleId] ?? {}
    moduleProgress[request.lessonId] = request.status
    curriculumProgress[request.moduleId] = moduleProgress
    progress[request.curriculumId] = curriculumProgress
    const parsed = curriculumProgressSchema.parse(progress)
    await this.progressStore.write({ progress: parsed })
    return parsed
  }

  private async readUserCurricula(): Promise<Curriculum[]> {
    const { curricula } = await this.userCurriculaStore.read()
    const parsed = learningCatalogSchema.safeParse({ curricula })
    if (!parsed.success) {
      return []
    }
    return parsed.data.curricula.map((c) => ({ ...c, bundled: false }))
  }
}

export function defaultLearningService(userDataPath: string): LearningService {
  return new LearningService({
    userDataPath,
    bundledCatalog: [],
    generateId: () => randomUUID(),
    now: () => Date.now()
  })
}
