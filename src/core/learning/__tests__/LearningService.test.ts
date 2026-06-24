import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Curriculum } from '@shared/contracts'
import { LearningService } from '../LearningService'

const bundledCatalog: Curriculum[] = [
  {
    id: 'bundled:test',
    title: 'Bundled Test',
    area: 'linux',
    description: 'A bundled test curriculum.',
    modules: [
      {
        id: 'm1',
        title: 'Module 1',
        lessons: [
          {
            id: 'l1',
            type: 'read',
            title: 'Lesson 1',
            instructions: 'Read this.',
            estimatedMinutes: 2,
            objectives: [{ id: 'o1', text: 'Know stuff' }],
            hints: [],
            requiredTools: []
          }
        ]
      }
    ],
    requiredTools: [],
    offline: true,
    bundled: true,
    createdAt: 0
  }
]

async function makeTempUserData(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'learning-service-test-'))
}

function createService(userDataPath: string): LearningService {
  let nextId = 1
  return new LearningService({
    userDataPath,
    bundledCatalog,
    generateId: () => `id-${nextId++}`,
    now: () => 42
  })
}

describe('LearningService', () => {
  let userDataPath: string

  beforeEach(async () => {
    userDataPath = await makeTempUserData()
  })

  afterEach(async () => {
    await rm(userDataPath, { recursive: true, force: true })
  })

  it('lists bundled curricula', async () => {
    const service = createService(userDataPath)
    const curricula = await service.listCurricula()
    expect(curricula).toHaveLength(1)
    expect(curricula[0].id).toBe('bundled:test')
    expect(curricula[0].bundled).toBe(true)
  })

  it('creates, lists, and deletes a user curriculum', async () => {
    const service = createService(userDataPath)
    const created = await service.createUserCurriculum({
      title: 'My Curriculum',
      area: 'git',
      description: 'User-created.',
      modules: [
        {
          id: 'um1',
          title: 'User module',
          lessons: [
            {
              id: 'ul1',
              type: 'read',
              title: 'User lesson',
              instructions: 'Read.',
              estimatedMinutes: 1,
              objectives: [],
              hints: [],
              requiredTools: []
            }
          ]
        }
      ],
      requiredTools: [],
      offline: true
    })

    expect(created.id).toBe('user:id-1')
    expect(created.bundled).toBe(false)

    const curricula = await service.listCurricula()
    expect(curricula).toHaveLength(2)
    expect(curricula.some((c) => c.id === created.id)).toBe(true)

    await service.deleteUserCurriculum({ curriculumId: created.id })
    const afterDelete = await service.listCurricula()
    expect(afterDelete).toHaveLength(1)
  })

  it('updates a user curriculum', async () => {
    const service = createService(userDataPath)
    const created = await service.createUserCurriculum({
      title: 'Original',
      area: 'other',
      description: 'Original description.',
      modules: [
        {
          id: 'um1',
          title: 'Module',
          lessons: [
            {
              id: 'ul1',
              type: 'read',
              title: 'Lesson',
              instructions: 'Read.',
              estimatedMinutes: 1,
              objectives: [],
              hints: [],
              requiredTools: []
            }
          ]
        }
      ],
      requiredTools: [],
      offline: true
    })

    const updated = await service.updateUserCurriculum({
      id: created.id,
      title: 'Updated'
    })
    expect(updated?.title).toBe('Updated')

    const fetched = await service.getCurriculum({ curriculumId: created.id })
    expect(fetched?.title).toBe('Updated')
  })

  it('records and retrieves progress', async () => {
    const service = createService(userDataPath)
    const before = await service.getProgress()
    expect(before).toEqual({})

    const after = await service.updateProgress({
      curriculumId: 'bundled:test',
      moduleId: 'm1',
      lessonId: 'l1',
      status: 'completed'
    })

    expect(after['bundled:test']?.['m1']?.['l1']).toBe('completed')
    const stored = await service.getProgress()
    expect(stored['bundled:test']?.['m1']?.['l1']).toBe('completed')
  })

  it('prevents modifying or deleting bundled curricula', async () => {
    const service = createService(userDataPath)
    await expect(
      service.updateUserCurriculum({ id: 'bundled:test', title: 'Changed' })
    ).rejects.toThrow('Bundled curricula cannot be modified.')
    await expect(service.deleteUserCurriculum({ curriculumId: 'bundled:test' })).rejects.toThrow(
      'Bundled curricula cannot be deleted.'
    )
  })
})
