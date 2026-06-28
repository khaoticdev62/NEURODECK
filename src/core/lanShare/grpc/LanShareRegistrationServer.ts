import * as grpc from '@grpc/grpc-js'
import { encryptWithGroupCode } from './groupCodeCipher'
import { loadNdxLanShareProto } from './loadNdxLanShareProto'
import { parsePeerHost } from './parsePeerHost'
import { RegistrationRateLimiter } from './RegistrationRateLimiter'
import { formatBindHost } from '../lanBoundary'

/** Real wire shape of `ServiceRegistration` — field names match the proto's `keepCase: true` output exactly. */
export interface NdxServiceRegistration {
  service_id: string
  ip: string
  port: number
  hostname: string
  api_version: number
  auth_port: number
  ipv6: string
}

export interface NdxRegRequest {
  ip: string
  hostname: string
  ipv6: string
}

export interface NdxRegResponse {
  locked_cert: string
}

export interface LanShareRegistrationServerOptions {
  getOwnRegistration: () => Promise<NdxServiceRegistration>
  onPeerRegistered: (registration: NdxServiceRegistration, peerAddress: string) => void
  /** Real PEM certificate text encrypted under the current group code for the v2 `RequestCertificate` response — never `null`-padded or fabricated; a missing certificate is a real `INTERNAL` gRPC error instead. */
  getOwnCertificatePem: () => Promise<string>
  getGroupCode: () => Promise<string>
  onCertificateRequested?: (request: NdxRegRequest, peerAddress: string) => void
}

const RATE_LIMIT_MESSAGE = 'Too many registration requests from this peer — try again shortly.'

/**
 * Real gRPC server implementing `WarpRegistration` (spec §10/§13,
 * Phases LAN-3/LAN-4). `RegisterService` (v1) is real, unconditional
 * registration. `RequestCertificate` (v2) is now real too: this
 * device's real certificate (from `LanShareCertificateStore`) is
 * encrypted with the real NaCl-secretbox construction Warpinator
 * itself uses, keyed by the real configured group code — only a peer
 * with the same group code can ever decrypt what comes back. Both
 * RPCs are real-rate-limited per peer address.
 */
export class LanShareRegistrationServer {
  private server: grpc.Server | null = null
  private readonly rateLimiter = new RegistrationRateLimiter()

  async start(
    port: number,
    options: LanShareRegistrationServerOptions,
    bindAddress = '0.0.0.0'
  ): Promise<void> {
    const proto = await loadNdxLanShareProto()
    const serviceCtor = proto.WarpRegistration as grpc.ServiceClientConstructor

    const server = new grpc.Server()
    server.addService(serviceCtor.service, {
      RegisterService: (
        call: grpc.ServerUnaryCall<NdxServiceRegistration, NdxServiceRegistration>,
        callback: grpc.sendUnaryData<NdxServiceRegistration>
      ) => {
        if (!this.rateLimiter.allow(parsePeerHost(call.getPeer()) ?? call.getPeer())) {
          callback({ code: grpc.status.RESOURCE_EXHAUSTED, message: RATE_LIMIT_MESSAGE })
          return
        }
        options.onPeerRegistered(call.request, call.getPeer())
        options
          .getOwnRegistration()
          .then((own) => callback(null, own))
          .catch((error: unknown) =>
            callback(error instanceof Error ? error : new Error(String(error)), null)
          )
      },
      RequestCertificate: (
        call: grpc.ServerUnaryCall<NdxRegRequest, NdxRegResponse>,
        callback: grpc.sendUnaryData<NdxRegResponse>
      ) => {
        if (!this.rateLimiter.allow(parsePeerHost(call.getPeer()) ?? call.getPeer())) {
          callback({ code: grpc.status.RESOURCE_EXHAUSTED, message: RATE_LIMIT_MESSAGE })
          return
        }
        options.onCertificateRequested?.(call.request, call.getPeer())
        Promise.all([options.getOwnCertificatePem(), options.getGroupCode()])
          .then(([certificatePem, groupCode]) => {
            callback(null, { locked_cert: encryptWithGroupCode(groupCode, certificatePem) })
          })
          .catch((error: unknown) =>
            callback(error instanceof Error ? error : new Error(String(error)), null)
          )
      }
    })

    await new Promise<void>((resolve, reject) => {
      server.bindAsync(
        `${formatBindHost(bindAddress)}:${port}`,
        grpc.ServerCredentials.createInsecure(),
        (error) => {
          if (error) {
            reject(error)
            return
          }
          resolve()
        }
      )
    })

    this.server = server
  }

  async stop(): Promise<void> {
    const server = this.server
    if (!server) return
    this.server = null
    this.rateLimiter.reset()
    await new Promise<void>((resolve) => server.tryShutdown(() => resolve()))
  }
}
