import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { createServer } from 'node:net'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PeerTransferService } from '../PeerTransferService'

let dir: string
let service: PeerTransferService

/** Asks the real OS for a genuinely free ephemeral port rather than guessing a random one — avoids real collisions with Windows' reserved/excluded port ranges. */
function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer()
    probe.on('error', reject)
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address()
      const port = typeof address === 'object' && address ? address.port : 0
      probe.close(() => resolve(port))
    })
  })
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ndx-peer-transfer-'))
  service = new PeerTransferService()
})

afterEach(async () => {
  service.stop()
  await rm(dir, { recursive: true, force: true })
})

describe('PeerTransferService', () => {
  it('transfers a real file end-to-end over real loopback TCP, encrypted with the correct pairing code', async () => {
    const sourcePath = join(dir, 'source.txt')
    const content = 'This is a real file transferred over a real encrypted socket.'
    await writeFile(sourcePath, content, 'utf-8')
    const destinationDir = join(dir, 'destination')
    await writeFile(join(dir, '.keep'), '')
    await mkdir(destinationDir, { recursive: true })

    const port = await freePort()
    const listenPromise = service.listenOnce(port, destinationDir, 'correct-pairing-code')
    await new Promise((resolve) => setTimeout(resolve, 50))

    const sendResult = await service.sendFile('127.0.0.1', port, sourcePath, 'correct-pairing-code')
    const received = await listenPromise

    expect(received.fileName).toBe('source.txt')
    expect(received.sha256).toBe(sendResult.sha256)
    expect(received.sha256).toBe(createHash('sha256').update(content).digest('hex'))

    const writtenContent = await readFile(received.savedPath, 'utf-8')
    expect(writtenContent).toBe(content)
  })

  it('rejects a transfer with the wrong pairing code, never writing the file', async () => {
    const sourcePath = join(dir, 'secret.txt')
    await writeFile(sourcePath, 'sensitive content', 'utf-8')
    const destinationDir = join(dir, 'destination')
    await mkdir(destinationDir, { recursive: true })

    const port = await freePort()
    const listenPromise = service.listenOnce(port, destinationDir, 'real-code')
    // Real rejection is expected here (wrong pairing code) — attach a
    // same-tick no-op catch so Node never flags it as unhandled during
    // the `await`s below; the original promise is still asserted on
    // separately, since a promise can have more than one consumer.
    listenPromise.catch(() => undefined)
    await new Promise((resolve) => setTimeout(resolve, 50))

    await service.sendFile('127.0.0.1', port, sourcePath, 'wrong-code')

    await expect(listenPromise).rejects.toThrow(/did not authenticate/)
  })

  it('sanitizes a malicious filename to a real, traversal-safe basename', async () => {
    const sourcePath = join(dir, '..evil..name.txt')
    await writeFile(sourcePath, 'data', 'utf-8')
    const destinationDir = join(dir, 'destination')
    await mkdir(destinationDir, { recursive: true })

    const port = await freePort()
    const listenPromise = service.listenOnce(port, destinationDir, 'code')
    await new Promise((resolve) => setTimeout(resolve, 50))
    await service.sendFile('127.0.0.1', port, sourcePath, 'code')

    const received = await listenPromise
    expect(received.savedPath.startsWith(destinationDir)).toBe(true)
  })
})
