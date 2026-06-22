import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge } from '@shared/contracts'
import { FocusEngineProvider } from '../../../controller/focus/FocusEngineProvider'
import { TestAdapter } from '../../../controller/testing/testAdapter'
import { ProjectTree } from '../ProjectTree'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

function renderTree(
  onOpenFile = vi.fn()
): { onOpenFile: typeof onOpenFile } & ReturnType<typeof render> {
  const result = render(
    <FocusEngineProvider adapters={[new TestAdapter()]}>
      <ProjectTree workspaceId="w1" onOpenFile={onOpenFile} />
    </FocusEngineProvider>
  )
  return { ...result, onOpenFile }
}

describe('ProjectTree', () => {
  it('lists real top-level entries on mount', async () => {
    const list = vi.fn().mockResolvedValue({
      ok: true,
      data: [
        { name: 'src', path: 'src', isDirectory: true, sizeBytes: 0, modifiedAt: Date.now() },
        {
          name: 'readme.md',
          path: 'readme.md',
          isDirectory: false,
          sizeBytes: 5,
          modifiedAt: Date.now()
        }
      ]
    })
    stubBridge({ files: { list } as never })

    renderTree()

    expect(await screen.findByText(/readme\.md/)).toBeInTheDocument()
    expect(list).toHaveBeenCalledWith({ workspaceId: 'w1', relativePath: '' })
  })

  it('expands a real subdirectory on activation', async () => {
    const list = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        data: [
          { name: 'src', path: 'src', isDirectory: true, sizeBytes: 0, modifiedAt: Date.now() }
        ]
      })
      .mockResolvedValueOnce({
        ok: true,
        data: [
          {
            name: 'index.ts',
            path: 'src/index.ts',
            isDirectory: false,
            sizeBytes: 1,
            modifiedAt: Date.now()
          }
        ]
      })
    stubBridge({ files: { list } as never })

    const user = userEvent.setup()
    renderTree()
    await screen.findByText(/src/)

    await user.click(screen.getByText(/src/))

    expect(await screen.findByText(/index\.ts/)).toBeInTheDocument()
    expect(list).toHaveBeenLastCalledWith({ workspaceId: 'w1', relativePath: 'src' })
  })

  it('calls onOpenFile with the exact path when a file row is activated', async () => {
    const list = vi.fn().mockResolvedValue({
      ok: true,
      data: [
        {
          name: 'readme.md',
          path: 'readme.md',
          isDirectory: false,
          sizeBytes: 5,
          modifiedAt: Date.now()
        }
      ]
    })
    stubBridge({ files: { list } as never })

    const user = userEvent.setup()
    const { onOpenFile } = renderTree()
    await screen.findByText(/readme\.md/)

    await user.click(screen.getByText(/readme\.md/))

    expect(onOpenFile).toHaveBeenCalledWith('readme.md')
  })
})
