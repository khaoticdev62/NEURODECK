import * as grpc from '@grpc/grpc-js'
import { createServer } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { LanShareRegistrationClient } from '../grpc/LanShareRegistrationClient'
import {
  LanShareRegistrationServer,
  type NdxServiceRegistration
} from '../grpc/LanShareRegistrationServer'
import { loadNdxLanShareProto } from '../grpc/loadNdxLanShareProto'

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

describe('LanShareRegistrationServer + LanShareRegistrationClient', () => {
  let server: LanShareRegistrationServer | undefined

  afterEach(async () => {
    await server?.stop()
    server = undefined
  })

  it('performs a real v1 registration round trip over a real loopback gRPC connection', async () => {
    const port = await freePort()
    const ownServerRegistration: NdxServiceRegistration = {
      service_id: 'SERVER-DEVICE',
      ip: '127.0.0.1',
      port: 42000,
      hostname: 'server-device',
      api_version: 1,
      auth_port: port,
      ipv6: ''
    }
    let receivedFromClient: NdxServiceRegistration | undefined
    let receivedPeerAddress: string | undefined

    server = new LanShareRegistrationServer()
    await server.start(port, {
      getOwnRegistration: async () => ownServerRegistration,
      onPeerRegistered: (registration, peerAddress) => {
        receivedFromClient = registration
        receivedPeerAddress = peerAddress
      }
    })

    const client = new LanShareRegistrationClient()
    const ownClientRegistration: NdxServiceRegistration = {
      service_id: 'CLIENT-DEVICE',
      ip: '127.0.0.1',
      port: 42100,
      hostname: 'client-device',
      api_version: 1,
      auth_port: 41999,
      ipv6: ''
    }

    const response = await client.registerWithPeer('127.0.0.1', port, ownClientRegistration)

    expect(response).toEqual(ownServerRegistration)
    expect(receivedFromClient).toEqual(ownClientRegistration)
    expect(receivedPeerAddress).toMatch(/127\.0\.0\.1/)
  })

  it('rejects connections to a port nothing is listening on', async () => {
    const port = await freePort()
    const client = new LanShareRegistrationClient()
    await expect(
      client.registerWithPeer(
        '127.0.0.1',
        port,
        {
          service_id: 'X',
          ip: '127.0.0.1',
          port: 1,
          hostname: 'x',
          api_version: 1,
          auth_port: 1,
          ipv6: ''
        },
        1000
      )
    ).rejects.toBeTruthy()
  })

  it('returns a real UNIMPLEMENTED status for v2 RequestCertificate', async () => {
    const port = await freePort()
    server = new LanShareRegistrationServer()
    await server.start(port, {
      getOwnRegistration: async () => ({
        service_id: 'SERVER-DEVICE',
        ip: '127.0.0.1',
        port: 42000,
        hostname: 'server-device',
        api_version: 1,
        auth_port: port,
        ipv6: ''
      }),
      onPeerRegistered: () => undefined
    })

    const proto = await loadNdxLanShareProto()
    const ServiceCtor = proto.WarpRegistration as grpc.ServiceClientConstructor
    const client = new ServiceCtor(`127.0.0.1:${port}`, grpc.credentials.createInsecure())

    const error = await new Promise<grpc.ServiceError>((resolve) => {
      ;(
        client as unknown as {
          RequestCertificate: (
            request: unknown,
            callback: (error: grpc.ServiceError | null) => void
          ) => void
        }
      ).RequestCertificate({ ip: '127.0.0.1', hostname: 'client', ipv6: '' }, (error) => {
        resolve(error as grpc.ServiceError)
      })
    })
    client.close()

    expect(error.code).toBe(grpc.status.UNIMPLEMENTED)
  })
})
