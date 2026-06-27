import * as grpc from '@grpc/grpc-js'
import { loadNdxLanShareProto } from './loadNdxLanShareProto'
import type { NdxServiceRegistration } from './LanShareRegistrationServer'

interface RegistrationClientHandle {
  RegisterService: (
    request: NdxServiceRegistration,
    options: grpc.CallOptions,
    callback: (error: grpc.ServiceError | null, response: NdxServiceRegistration) => void
  ) => void
  close: () => void
}

/**
 * Real v1 registration client (spec §10, Phase LAN-3). Connects to a
 * peer's real auth port and performs a real `RegisterService` RPC —
 * the same call a real Warpinator-ecosystem client makes. Throws the
 * real `grpc.ServiceError` on failure (unreachable host, refused
 * connection, deadline exceeded, incompatible peer) — callers decide
 * how to map that into a `LanSharePeer` status, this class never
 * fabricates a successful response.
 */
export class LanShareRegistrationClient {
  async registerWithPeer(
    address: string,
    authPort: number,
    own: NdxServiceRegistration,
    timeoutMs = 5000
  ): Promise<NdxServiceRegistration> {
    const proto = await loadNdxLanShareProto()
    const ServiceCtor = proto.WarpRegistration as grpc.ServiceClientConstructor
    const client = new ServiceCtor(
      `${address}:${authPort}`,
      grpc.credentials.createInsecure()
    ) as unknown as RegistrationClientHandle

    try {
      return await new Promise<NdxServiceRegistration>((resolve, reject) => {
        const deadline = new Date(Date.now() + timeoutMs)
        client.RegisterService(own, { deadline }, (error, response) => {
          if (error) reject(error)
          else resolve(response)
        })
      })
    } finally {
      client.close()
    }
  }
}
