import * as grpc from '@grpc/grpc-js'
import { decryptWithGroupCode } from './groupCodeCipher'
import type {
  NdxRegRequest,
  NdxRegResponse,
  NdxServiceRegistration
} from './LanShareRegistrationServer'
import { loadNdxLanShareProto } from './loadNdxLanShareProto'

interface RegistrationClientHandle {
  RegisterService: (
    request: NdxServiceRegistration,
    options: grpc.CallOptions,
    callback: (error: grpc.ServiceError | null, response: NdxServiceRegistration) => void
  ) => void
  RequestCertificate: (
    request: NdxRegRequest,
    options: grpc.CallOptions,
    callback: (error: grpc.ServiceError | null, response: NdxRegResponse) => void
  ) => void
  close: () => void
}

export interface VerifiedPeerCertificate {
  certificatePem: string
}

/**
 * Real v1/v2 registration client (spec §10/§13, Phases LAN-3/LAN-4).
 * `registerWithPeer` is real v1. `requestCertificate` is real v2: it
 * calls the peer's real `RequestCertificate` RPC, then decrypts the
 * returned `locked_cert` with this device's own configured group code
 * using the same NaCl-secretbox construction Warpinator itself uses.
 * A decryption failure (wrong/mismatched group code) is reported as a
 * real, typed result rather than thrown as an opaque error, since a
 * group mismatch is an expected, non-exceptional outcome callers need
 * to branch on (mapping to the real `LAN_GROUP_MISMATCH` error code).
 */
export class LanShareRegistrationClient {
  async registerWithPeer(
    address: string,
    authPort: number,
    own: NdxServiceRegistration,
    timeoutMs = 5000
  ): Promise<NdxServiceRegistration> {
    const client = await this.openClient(address, authPort)
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

  /** Returns `null` specifically on a real decryption failure (group mismatch) — any other failure (unreachable, timeout, UNIMPLEMENTED on a v1-only peer) still throws, since those are genuinely exceptional, not an expected branch. */
  async requestCertificate(
    address: string,
    authPort: number,
    ownGroupCode: string,
    request: NdxRegRequest,
    timeoutMs = 5000
  ): Promise<VerifiedPeerCertificate | null> {
    const client = await this.openClient(address, authPort)
    try {
      const response = await new Promise<NdxRegResponse>((resolve, reject) => {
        const deadline = new Date(Date.now() + timeoutMs)
        client.RequestCertificate(request, { deadline }, (error, response) => {
          if (error) reject(error)
          else resolve(response)
        })
      })
      const certificatePem = decryptWithGroupCode(ownGroupCode, response.locked_cert)
      return certificatePem ? { certificatePem } : null
    } finally {
      client.close()
    }
  }

  private async openClient(address: string, authPort: number): Promise<RegistrationClientHandle> {
    const proto = await loadNdxLanShareProto()
    const ServiceCtor = proto.WarpRegistration as grpc.ServiceClientConstructor
    return new ServiceCtor(
      `${address}:${authPort}`,
      grpc.credentials.createInsecure()
    ) as unknown as RegistrationClientHandle
  }
}
