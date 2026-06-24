import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Curriculum, CurriculumProgress, NdxBridge } from '@shared/contracts'
import { GuidedLab } from '../GuidedLab'
import { renderWithProviders } from '../../../__tests__/testUtils'

vi.mock('../LabTerminal', () => ({
  LabTerminal: () => <div>Lab terminal placeholder</div>
}))

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
          instructions: 'Read this lesson carefully.\n\nIt has two paragraphs.',
          estimatedMinutes: 5,
          objectives: [{ id: 'o1', text: 'Finish reading' }],
          hints: [{ id: 'h1', text: 'Take your time' }],
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

function setupBridge(progress: CurriculumProgress = {}): void {
  window.ndx = {
    workspaces: {
      list: vi.fn().mockResolvedValue({ ok: true, data: [] })
    },
    learning: {
      listCurricula: vi.fn(),
      getCurriculum: vi.fn().mockResolvedValue({ ok: true, data: sampleCurriculum }),
      createUserCurriculum: vi.fn(),
      updateUserCurriculum: vi.fn(),
      deleteUserCurriculum: vi.fn(),
      getProgress: vi.fn().mockResolvedValue({ ok: true, data: progress }),
      updateProgress: vi.fn().mockResolvedValue({ ok: true, data: progress })
    },
    modelProviders: {
      list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
      add: vi.fn(),
      remove: vi.fn(),
      testConnection: vi.fn(),
      setEnabled: vi.fn(),
      route: vi.fn(),
      complete: vi.fn(),
      localStatus: vi.fn(),
      loadLocal: vi.fn(),
      unloadLocal: vi.fn(),
      benchmarkLocal: vi.fn()
    }
  } as unknown as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup
  delete window.ndx
})

describe('GuidedLab', () => {
  it('renders instructions, hints, and objectives', async () => {
    setupBridge()
    renderWithProviders(
      <Routes>
        <Route path="/learn/lab/:curriculumId/:moduleId/:lessonId" element={<GuidedLab />} />
      </Routes>,
      { initialEntries: ['/learn/lab/bundled:sample/m1/l1'] }
    )

    await waitFor(() => {
      expect(screen.getByText('Sample Curriculum — Module 1')).toBeInTheDocument()
    })

    expect(screen.getByText('Read me')).toBeInTheDocument()
    expect(screen.getByText('Read this lesson carefully.')).toBeInTheDocument()
    expect(screen.getByText('Finish reading')).toBeInTheDocument()
    expect(screen.getByText('Take your time')).toBeInTheDocument()
  })

  it('marks a lesson complete and updates progress', async () => {
    const updateProgress = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        'bundled:sample': {
          m1: {
            l1: 'completed'
          }
        }
      }
    })
    setupBridge()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window.ndx as any).learning.updateProgress = updateProgress

    renderWithProviders(
      <Routes>
        <Route path="/learn/lab/:curriculumId/:moduleId/:lessonId" element={<GuidedLab />} />
      </Routes>,
      { initialEntries: ['/learn/lab/bundled:sample/m1/l1'] }
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Mark complete' })).toBeInTheDocument()
    })

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Mark complete' }))

    await waitFor(() => {
      expect(updateProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          curriculumId: 'bundled:sample',
          moduleId: 'm1',
          lessonId: 'l1',
          status: 'completed'
        })
      )
    })
  })

  it('disables the AI coach when no provider is enabled', async () => {
    setupBridge()
    renderWithProviders(
      <Routes>
        <Route path="/learn/lab/:curriculumId/:moduleId/:lessonId" element={<GuidedLab />} />
      </Routes>,
      { initialEntries: ['/learn/lab/bundled:sample/m1/l1'] }
    )

    await waitFor(() => {
      expect(screen.getByText('AI coach')).toBeInTheDocument()
    })

    expect(screen.getByText('No AI provider is configured or enabled.')).toBeInTheDocument()
  })
})
