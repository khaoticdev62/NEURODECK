import * as grpc from '@grpc/grpc-js'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { LanShareTransferClient } from '../grpc/LanShareTransferClient'
import type {
  NdxFileChunk,
  NdxTransferOpRequest,
  PendingSendOperation
} from '../grpc/LanShareTransferServer'
import { LanShareTransferServer } from '../grpc/LanShareTransferServer'

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

describe('LanShareTransferServer + LanShareTransferClient', () => {
  let server: LanShareTransferServer | undefined
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'lan-share-transfer-'))
  })

  afterEach(async () => {
    await server?.stop()
    server = undefined
    await rm(dir, { recursive: true, force: true })
  })

  it('responds to a real Ping over a real loopback gRPC connection', async () => {
    const port = await freePort()
    server = new LanShareTransferServer()
    await server.start(port, {
      onTransferAnnounced: () => undefined,
      getPendingSendOperation: () => undefined
    })

    const client = new LanShareTransferClient()
    await expect(client.ping('127.0.0.1', port)).resolves.toBeUndefined()
  })

  it('binds to a specific real interface address when one is given instead of all interfaces', async () => {
    const port = await freePort()
    server = new LanShareTransferServer()
    await server.start(
      port,
      { onTransferAnnounced: () => undefined, getPendingSendOperation: () => undefined },
      '127.0.0.1'
    )

    const client = new LanShareTransferClient()
    await expect(client.ping('127.0.0.1', port)).resolves.toBeUndefined()
  })

  it('delivers a real ProcessTransferOpRequest announcement to the receiving peer', async () => {
    const port = await freePort()
    let received: NdxTransferOpRequest | undefined
    let receivedAddress: string | undefined

    server = new LanShareTransferServer()
    await server.start(port, {
      onTransferAnnounced: (request, address) => {
        received = request
        receivedAddress = address
      },
      getPendingSendOperation: () => undefined
    })

    const request: NdxTransferOpRequest = {
      info: {
        ident: 'op-1',
        timestamp: String(Date.now()),
        readable_name: 'photo.png',
        use_compression: false
      },
      sender_name: 'sender-device',
      receiver_name: 'receiver-device',
      receiver: 'receiver-connect-id',
      size: '1024',
      count: '1',
      name_if_single: 'photo.png',
      mime_if_single: '',
      top_dir_basenames: ['photo.png']
    }

    const client = new LanShareTransferClient()
    await client.announceTransfer('127.0.0.1', port, request)

    expect(received).toEqual(request)
    expect(receivedAddress).toBe('127.0.0.1')
  })

  it('returns a real NOT_FOUND status for StartTransfer with an unknown ident', async () => {
    const port = await freePort()
    server = new LanShareTransferServer()
    await server.start(port, {
      onTransferAnnounced: () => undefined,
      getPendingSendOperation: () => undefined
    })

    const client = new LanShareTransferClient()
    await expect(
      client.pullTransfer(
        '127.0.0.1',
        port,
        { ident: 'no-such-ident', timestamp: '0', readable_name: '', use_compression: false },
        async () => undefined
      )
    ).rejects.toMatchObject({ code: grpc.status.NOT_FOUND })
  })

  it('streams a real regular file end-to-end and the client receives the exact original bytes', async () => {
    const filePath = join(dir, 'note.txt')
    const content = 'real file contents for a real chunk-streaming test\n'.repeat(50)
    await writeFile(filePath, content, 'utf-8')

    const port = await freePort()
    const operation: PendingSendOperation = {
      files: [
        {
          absolutePath: filePath,
          relativePath: 'note.txt',
          fileType: 1,
          mode: 0o644,
          mtimeMs: Date.now()
        }
      ]
    }

    server = new LanShareTransferServer()
    await server.start(port, {
      onTransferAnnounced: () => undefined,
      getPendingSendOperation: (ident) => (ident === 'job-1' ? operation : undefined)
    })

    const received: NdxFileChunk[] = []
    const client = new LanShareTransferClient()
    await client.pullTransfer(
      '127.0.0.1',
      port,
      { ident: 'job-1', timestamp: '0', readable_name: 'note.txt', use_compression: false },
      async (chunk) => {
        received.push(chunk)
      }
    )

    const reassembled = Buffer.concat(received.map((chunk) => chunk.chunk)).toString('utf-8')
    expect(reassembled).toBe(content)
    expect(received.every((chunk) => chunk.relative_path === 'note.txt')).toBe(true)
  })

  it('streams a real regular file with real zlib-compressed chunks when negotiated', async () => {
    const filePath = join(dir, 'compressed.txt')
    const content = 'compressible content '.repeat(1000)
    await writeFile(filePath, content, 'utf-8')

    const port = await freePort()
    const operation: PendingSendOperation = {
      files: [
        {
          absolutePath: filePath,
          relativePath: 'compressed.txt',
          fileType: 1,
          mode: 0o644,
          mtimeMs: Date.now()
        }
      ]
    }

    server = new LanShareTransferServer()
    await server.start(port, {
      onTransferAnnounced: () => undefined,
      getPendingSendOperation: (ident) => (ident === 'job-2' ? operation : undefined)
    })

    const { decompressChunk } = await import('../grpc/fileChunkCompression')
    const received: NdxFileChunk[] = []
    const client = new LanShareTransferClient()
    await client.pullTransfer(
      '127.0.0.1',
      port,
      { ident: 'job-2', timestamp: '0', readable_name: 'compressed.txt', use_compression: true },
      async (chunk) => {
        received.push(chunk)
      }
    )

    const reassembled = Buffer.concat(
      received.map((chunk) => decompressChunk(chunk.chunk))
    ).toString('utf-8')
    expect(reassembled).toBe(content)
  })

  it('streams real directory and symlink marker chunks with no chunk bytes', async () => {
    const port = await freePort()
    const operation: PendingSendOperation = {
      files: [
        {
          absolutePath: '',
          relativePath: 'project',
          fileType: 2,
          mode: 0o755,
          mtimeMs: Date.now()
        },
        {
          absolutePath: '',
          relativePath: 'project/link',
          fileType: 3,
          mode: 0o777,
          mtimeMs: Date.now(),
          symlinkTarget: 'target.txt'
        }
      ]
    }

    server = new LanShareTransferServer()
    await server.start(port, {
      onTransferAnnounced: () => undefined,
      getPendingSendOperation: (ident) => (ident === 'job-3' ? operation : undefined)
    })

    const received: NdxFileChunk[] = []
    const client = new LanShareTransferClient()
    await client.pullTransfer(
      '127.0.0.1',
      port,
      { ident: 'job-3', timestamp: '0', readable_name: '', use_compression: false },
      async (chunk) => {
        received.push(chunk)
      }
    )

    expect(received).toHaveLength(2)
    expect(received[0].file_type).toBe(2)
    expect(received[0].chunk.length).toBe(0)
    expect(received[1].file_type).toBe(3)
    expect(received[1].symlink_target).toBe('target.txt')
  })
})
