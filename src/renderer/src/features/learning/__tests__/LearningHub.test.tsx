import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Curriculum, CurriculumProgress, NdxBridge } from '@shared/contracts'
import { LearningHub } from '../LearningHub'
import { renderWithProviders } from '../../../__tests__/testUtils'

const sampleCurriculum: Curriculum = {
  id: 'bundled:sample',
  title: 'Sample Curriculum',
  area: 'linux',
  description: 'A sample for testing.',
  modules: [
    {
      id: 'm1',
      title: 'Module 1',
      lessons: [
        {
          id: 'l1',
          type: 'read',
          title: 'Read me',
          instructions: 'Read this lesson.',
          estimatedMinutes: 5,
          objectives: [{ id: 'o1', text: 'Read it' }],
          hints: [],
          requiredTools: []
        },
        {
          id: 'l2',
          type: 'lab',
          title: 'Do it',
          instructions: 'Do this lab.',
          estimatedMinutes: 10,
          objectives: [],
          hints: [],
          requiredTools: ['terminal']
        }
      ]
    }
  ],
  requiredTools: ['terminal'],
  offline: true,
  bundled: true,
  createdAt: 0
}

function setupBridge(curricula: Curriculum[], progress: CurriculumProgress = {}): void {
  window.ndx = {
    workspaces: {
      list: vi.fn().mockResolvedValue({ ok: true, data: [] })
    },
    learning: {
      listCurricula: vi.fn().mockResolvedValue({ ok: true, data: curricula }),
      getCurriculum: vi.fn(),
      createUserCurriculum: vi.fn(),
      updateUserCurriculum: vi.fn(),
      deleteUserCurriculum: vi.fn(),
      getProgress: vi.fn().mockResolvedValue({ ok: true, data: progress }),
      updateProgress: vi.fn()
    }
  } as unknown as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup
  delete window.ndx
})

describe('LearningHub', () => {
  it('renders curriculum cards with progress and lab count', async () => {
    setupBridge([sampleCurriculum])
    renderWithProviders(<LearningHub />)

    await waitFor(() => {
      expect(screen.getByText('Sample Curriculum')).toBeInTheDocument()
    })

    expect(screen.getByText('15 min')).toBeInTheDocument()
    expect(screen.getByText('1 lab')).toBeInTheDocument()
    expect(screen.getByText('Progress')).toBeInTheDocument()
  })

  it('filters curricula by area', async () => {
    const gitCurriculum: Curriculum = {
      ...sampleCurriculum,
      id: 'bundled:git',
      title: 'Git Curriculum',
      area: 'git'
    }
    setupBridge([sampleCurriculum, gitCurriculum])
    renderWithProviders(<LearningHub />)

    await waitFor(() => {
      expect(screen.getByText('Sample Curriculum')).toBeInTheDocument()
    })

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Git' }))

    await waitFor(() => {
      expect(screen.queryByText('Sample Curriculum')).not.toBeInTheDocument()
      expect(screen.getByText('Git Curriculum')).toBeInTheDocument()
    })
  })

  it('creates a user curriculum', async () => {
    const create = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        ...sampleCurriculum,
        id: 'user:new',
        title: 'My New Curriculum',
        area: 'other',
        bundled: false
      }
    })
    setupBridge([sampleCurriculum])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window.ndx as any).learning.createUserCurriculum = create

    renderWithProviders(<LearningHub />)
    await waitFor(() => {
      expect(screen.getByText('Sample Curriculum')).toBeInTheDocument()
    })

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Create curriculum' }))

    const titleInput = screen.getByPlaceholderText('Curriculum title')
    await user.type(titleInput, 'My New Curriculum')

    await user.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => {
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'My New Curriculum',
          area: 'other'
        })
      )
    })
  })
})
