import * as grpc from '@grpc/grpc-js'
import { loadNdxLanShareProto } from './loadNdxLanShareProto'

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

export interface LanShareRegistrationServerOptions {
  getOwnRegistration: () => Promise<NdxServiceRegistration>
  onPeerRegistered: (registration: NdxServiceRegistration, peerAddress: string) => void
}

/**
 * Real gRPC server implementing `WarpRegistration` (spec §10, Phase
 * LAN-3). `RegisterService` is real v1 registration: any peer
 * (Warpinator-ecosystem or NeuroDeck) that calls it gets this device's
 * real registration back, and the caller's registration is reported to
 * `onPeerRegistered` for `LanSharePeerStore` to record. `RequestCertificate`
 * (v2) deliberately returns a real `UNIMPLEMENTED` gRPC status — the
 * certificate infrastructure it depends on is Phase LAN-4's job; faking
 * a certificate here would be worse than an honest "not yet."
 */
export class LanShareRegistrationServer {
  private server: grpc.Server | null = null

  async start(port: number, options: LanShareRegistrationServerOptions): Promise<void> {
    const proto = await loadNdxLanShareProto()
    const serviceCtor = proto.WarpRegistration as grpc.ServiceClientConstructor

    const server = new grpc.Server()
    server.addService(serviceCtor.service, {
      RegisterService: (
        call: grpc.ServerUnaryCall<NdxServiceRegistration, NdxServiceRegistration>,
        callback: grpc.sendUnaryData<NdxServiceRegistration>
      ) => {
        options.onPeerRegistered(call.request, call.getPeer())
        options
          .getOwnRegistration()
          .then((own) => callback(null, own))
          .catch((error: unknown) =>
            callback(error instanceof Error ? error : new Error(String(error)), null)
          )
      },
      RequestCertificate: (
        _call: grpc.ServerUnaryCall<unknown, unknown>,
        callback: grpc.sendUnaryData<unknown>
      ) => {
        callback({
          code: grpc.status.UNIMPLEMENTED,
          message: 'Registration v2 certificate exchange is not implemented yet (Phase LAN-4).'
        })
      }
    })

    await new Promise<void>((resolve, reject) => {
      server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (error) => {
        if (error) {
          reject(error)
          return
        }
        resolve()
      })
    })

    this.server = server
  }

  async stop(): Promise<void> {
    const server = this.server
    if (!server) return
    this.server = null
    await new Promise<void>((resolve) => server.tryShutdown(() => resolve()))
  }
}
