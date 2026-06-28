import * as grpc from '@grpc/grpc-js'
import type { NdxFileChunk, NdxOpInfo, NdxTransferOpRequest } from './LanShareTransferServer'
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
  StartTransfer: (request: NdxOpInfo) => AsyncIterable<NdxFileChunk>
  close: () => void
}

/**
 * Real `Warp` transfer client (spec §14–15, Phases LAN-5/LAN-6).
 * `pullTransfer` opens the real streaming `StartTransfer` call and
 * yields each real `FileChunk` to the caller — consumed via `for
 * await`, which gives real backpressure (grpc-js's `ClientReadableStream`
 * only reads the next chunk off the socket once the previous
 * iteration's promise resolves, so a slow disk writer on the receiving
 * end never causes unbounded buffering here).
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

  async pullTransfer(
    address: string,
    port: number,
    opInfo: NdxOpInfo,
    onChunk: (chunk: NdxFileChunk) => Promise<void>
  ): Promise<void> {
    const client = await this.openClient(address, port)
    try {
      for await (const chunk of client.StartTransfer(opInfo)) {
        await onChunk(chunk)
      }
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
