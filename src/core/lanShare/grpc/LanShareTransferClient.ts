import * as grpc from '@grpc/grpc-js'
import type { NdxTransferOpRequest } from './LanShareTransferServer'
import { loadNdxLanShareProto } from './loadNdxLanShareProto'

interface TransferClientHandle {
  Ping: (
    request: { id: string; readable_name: string },
    options: grpc.CallOptions,
    callback: (error: grpc.ServiceError | null) => void
  ) => void
  ProcessTransferOpRequest: (
    request: NdxTransferOpRequest,
    options: grpc.CallOptions,
    callback: (error: grpc.ServiceError | null) => void
  ) => void
  close: () => void
}

/**
 * Real `Warp` transfer client (spec §14, Phase LAN-5) — `ping` and
 * `announceTransfer` are real, working RPC calls. The real chunk-pull
 * (`StartTransfer` as a client) that would actually move file bytes
 * is Phase LAN-6 scope, once a real receiving/staging engine exists to
 * write what it pulls.
 */
export class LanShareTransferClient {
  async ping(address: string, port: number, timeoutMs = 5000): Promise<void> {
    const client = await this.openClient(address, port)
    try {
      await new Promise<void>((resolve, reject) => {
        const deadline = new Date(Date.now() + timeoutMs)
        client.Ping({ id: '', readable_name: '' }, { deadline }, (error) => {
          if (error) reject(error)
          else resolve()
        })
      })
    } finally {
      client.close()
    }
  }

  async announceTransfer(
    address: string,
    port: number,
    request: NdxTransferOpRequest,
    timeoutMs = 5000
  ): Promise<void> {
    const client = await this.openClient(address, port)
    try {
      await new Promise<void>((resolve, reject) => {
        const deadline = new Date(Date.now() + timeoutMs)
        client.ProcessTransferOpRequest(request, { deadline }, (error) => {
          if (error) reject(error)
          else resolve()
        })
      })
    } finally {
      client.close()
    }
  }

  private async openClient(address: string, port: number): Promise<TransferClientHandle> {
    const proto = await loadNdxLanShareProto()
    const ServiceCtor = proto.Warp as grpc.ServiceClientConstructor
    return new ServiceCtor(
      `${address}:${port}`,
      grpc.credentials.createInsecure()
    ) as unknown as TransferClientHandle
  }
}
