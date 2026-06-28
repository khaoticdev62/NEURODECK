import * as grpc from '@grpc/grpc-js'
import { createServer } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { LanShareTransferClient } from '../grpc/LanShareTransferClient'
import type { NdxTransferOpRequest } from '../grpc/LanShareTransferServer'
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

  afterEach(async () => {
    await server?.stop()
    server = undefined
  })

  it('responds to a real Ping over a real loopback gRPC connection', async () => {
    const port = await freePort()
    server = new LanShareTransferServer()
    await server.start(port, { onTransferAnnounced: () => undefined })

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
      }
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

  it('returns a real UNIMPLEMENTED status for StartTransfer (Phase LAN-6)', async () => {
    const port = await freePort()
    server = new LanShareTransferServer()
    await server.start(port, { onTransferAnnounced: () => undefined })

    const proto = await (await import('../grpc/loadNdxLanShareProto')).loadNdxLanShareProto()
    const ServiceCtor = proto.Warp as grpc.ServiceClientConstructor
    const client = new ServiceCtor(`127.0.0.1:${port}`, grpc.credentials.createInsecure())

    const error = await new Promise<grpc.ServiceError>((resolve) => {
      const call = (
        client as unknown as {
          StartTransfer: (request: unknown) => NodeJS.ReadableStream
        }
      ).StartTransfer({ ident: 'x', timestamp: 0, readable_name: '', use_compression: false })
      call.on('error', (error: grpc.ServiceError) => resolve(error))
      call.on('data', () => undefined)
    })
    client.close()

    expect(error.code).toBe(grpc.status.UNIMPLEMENTED)
  })
})
