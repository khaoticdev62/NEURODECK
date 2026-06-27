import { createServer } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { LanShareRegistrationClient } from '../grpc/LanShareRegistrationClient'
import {
  LanShareRegistrationServer,
  type LanShareRegistrationServerOptions,
  type NdxServiceRegistration
} from '../grpc/LanShareRegistrationServer'

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

const FAKE_CERT_PEM = '-----BEGIN CERTIFICATE-----\nFAKEFORTESTING\n-----END CERTIFICATE-----'

function baseOptions(
  overrides: Partial<LanShareRegistrationServerOptions> = {}
): LanShareRegistrationServerOptions {
  return {
    getOwnRegistration: async () => ({
      service_id: 'SERVER-DEVICE',
      ip: '127.0.0.1',
      port: 42000,
      hostname: 'server-device',
      api_version: 1,
      auth_port: 0,
      ipv6: ''
    }),
    onPeerRegistered: () => undefined,
    getOwnCertificatePem: async () => FAKE_CERT_PEM,
    getGroupCode: async () => 'Warpinator',
    ...overrides
  }
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
    await server.start(
      port,
      baseOptions({
        getOwnRegistration: async () => ownServerRegistration,
        onPeerRegistered: (registration, peerAddress) => {
          receivedFromClient = registration
          receivedPeerAddress = peerAddress
        }
      })
    )

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

  it('performs a real v2 certificate exchange when both sides share the real group code', async () => {
    const port = await freePort()
    server = new LanShareRegistrationServer()
    await server.start(port, baseOptions({ getGroupCode: async () => 'shared-secret-code' }))

    const client = new LanShareRegistrationClient()
    const result = await client.requestCertificate('127.0.0.1', port, 'shared-secret-code', {
      ip: '127.0.0.1',
      hostname: 'client',
      ipv6: ''
    })

    expect(result?.certificatePem).toBe(FAKE_CERT_PEM)
  })

  it('returns null (a real, detectable group mismatch) when group codes differ', async () => {
    const port = await freePort()
    server = new LanShareRegistrationServer()
    await server.start(port, baseOptions({ getGroupCode: async () => 'server-code' }))

    const client = new LanShareRegistrationClient()
    const result = await client.requestCertificate(
      '127.0.0.1',
      port,
      'client-has-a-different-code',
      { ip: '127.0.0.1', hostname: 'client', ipv6: '' }
    )

    expect(result).toBeNull()
  })

  it('rate-limits a peer that exceeds the real per-peer request limit', async () => {
    const port = await freePort()
    server = new LanShareRegistrationServer()
    await server.start(port, baseOptions())

    const client = new LanShareRegistrationClient()
    const request = {
      service_id: 'X',
      ip: '127.0.0.1',
      port: 1,
      hostname: 'x',
      api_version: 1,
      auth_port: 1,
      ipv6: ''
    }

    for (let i = 0; i < 10; i += 1) {
      await client.registerWithPeer('127.0.0.1', port, request)
    }
    await expect(client.registerWithPeer('127.0.0.1', port, request)).rejects.toMatchObject({
      code: 8 // grpc.status.RESOURCE_EXHAUSTED
    })
  })
})
