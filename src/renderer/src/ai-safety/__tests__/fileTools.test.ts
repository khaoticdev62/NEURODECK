import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge } from '@shared/contracts'
import { createFileTools } from '../tools/fileTools'

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload injects
  delete window.ndx
})

describe('fileTools', () => {
  it('registers the write and delete tools with real capabilities and risk levels', () => {
    const tools = createFileTools()
    expect(tools.map((tool) => [tool.id, tool.risk, tool.requiredCapability])).toEqual([
      ['files-write', 'medium', 'files.write'],
      ['files-delete', 'high', 'files.delete']
    ])
  })

  it('validates write arguments and calls the real fileWrite IPC client', async () => {
    const write = vi.fn().mockResolvedValue({ ok: true, data: null })
    window.ndx = { files: { write } as never } as Partial<NdxBridge> as NdxBridge
    const tool = createFileTools()[0]

    expect(await tool.run({ relativePath: 'a.txt' })).toMatchObject({ success: false })

    const result = await tool.run({
      workspaceId: 'w1',
      relativePath: 'notes/a.txt',
      content: 'hello',
      description: 'Workflow step wrote a.txt'
    })

    expect(result).toEqual({ success: true, message: 'Wrote notes/a.txt.' })
    expect(write).toHaveBeenCalledWith({
      workspaceId: 'w1',
      relativePath: 'notes/a.txt',
      content: 'hello',
      description: 'Workflow step wrote a.txt'
    })
  })

  it('surfaces a real fileWrite failure as a tool failure', async () => {
    const write = vi.fn().mockResolvedValue({
      ok: false,
      error: { userMessage: 'That path is outside the workspace.' }
    })
    window.ndx = { files: { write } as never } as Partial<NdxBridge> as NdxBridge
    const tool = createFileTools()[0]

    const result = await tool.run({
      workspaceId: 'w1',
      relativePath: '../escape.txt',
      content: 'x',
      description: 'desc'
    })

    expect(result).toEqual({ success: false, message: 'That path is outside the workspace.' })
  })

  it('validates delete arguments and calls the real fileDelete IPC client', async () => {
    const deleteFile = vi.fn().mockResolvedValue({ ok: true, data: null })
    window.ndx = { files: { delete: deleteFile } as never } as Partial<NdxBridge> as NdxBridge
    const tool = createFileTools()[1]

    expect(await tool.run({})).toMatchObject({ success: false })

    const result = await tool.run({ workspaceId: 'w1', relativePath: 'old.txt' })

    expect(result).toEqual({ success: true, message: 'Deleted old.txt.' })
    expect(deleteFile).toHaveBeenCalledWith({ workspaceId: 'w1', relativePath: 'old.txt' })
  })
})
