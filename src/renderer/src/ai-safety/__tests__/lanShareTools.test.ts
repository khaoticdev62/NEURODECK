import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge } from '@shared/contracts'
import { createLanShareTools } from '../tools/lanShareTools'

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload injects
  delete window.ndx
})

describe('lanShareTools', () => {
  it('registers the send-files tool with the real external.send capability and high, irreversible risk', () => {
    const tools = createLanShareTools()
    expect(
      tools.map((tool) => [tool.id, tool.risk, tool.reversible, tool.requiredCapability])
    ).toEqual([['lan-share-send-files', 'high', false, 'external.send']])
  })

  it('validates arguments and calls the real sendLanShareFiles IPC client', async () => {
    const sendFiles = vi.fn().mockResolvedValue({
      ok: true,
      data: { id: 'job-1', status: 'queued' }
    })
    window.ndx = { lanShare: { sendFiles } as never } as Partial<NdxBridge> as NdxBridge
    const tool = createLanShareTools()[0]

    expect(await tool.run({ peerId: 'peer-1' })).toMatchObject({ success: false })

    const result = await tool.run({ peerId: 'peer-1', sourcePaths: ['/tmp/file.txt'] })

    expect(result).toEqual({ success: true, message: 'Started sending to peer peer-1.' })
    expect(sendFiles).toHaveBeenCalledWith({ peerId: 'peer-1', sourcePaths: ['/tmp/file.txt'] })
  })

  it('surfaces a real send failure as a tool failure', async () => {
    const sendFiles = vi.fn().mockResolvedValue({
      ok: false,
      error: { userMessage: 'That peer is not known.' }
    })
    window.ndx = { lanShare: { sendFiles } as never } as Partial<NdxBridge> as NdxBridge
    const tool = createLanShareTools()[0]

    const result = await tool.run({ peerId: 'peer-1', sourcePaths: ['/tmp/file.txt'] })

    expect(result).toEqual({ success: false, message: 'That peer is not known.' })
  })
})
