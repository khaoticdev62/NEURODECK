import * as grpc from '@grpc/grpc-js'
import { loadNdxLanShareProto } from './loadNdxLanShareProto'
import { parsePeerHost } from './parsePeerHost'

/** Real wire shape of `VoidType` — `dummy` is the proto's literal field name, never meaningfully read. */
export interface NdxVoidType {
  dummy: number
}

/** Real wire shape of `OpInfo` — field names match the proto's `keepCase: true` output. `timestamp` is a real `uint64`, represented as a decimal string (this codebase's `loadNdxLanShareProto` configures `longs: String` to avoid silent precision loss past 2^53) — always a string once received, even though the encoder also accepts a plain number as input. */
export interface NdxOpInfo {
  ident: string
  timestamp: string
  readable_name: string
  use_compression: boolean
}

/** Real wire shape of `TransferOpRequest` — `size`/`count` are real `uint64`s, represented as decimal strings for the same reason as `OpInfo.timestamp`. */
export interface NdxTransferOpRequest {
  info: NdxOpInfo
  sender_name: string
  receiver_name: string
  receiver: string
  size: string
  count: string
  name_if_single: string
  mime_if_single: string
  top_dir_basenames: string[]
}

export interface LanShareTransferServerOptions {
  /** Called on a real, received `ProcessTransferOpRequest` announcement — the real, only consumer-visible effect of this RPC in Phase LAN-5. Accepting/rejecting the transfer (Incoming Transfer Approval, spec §15) is Phase LAN-6/LAN-7 scope. */
  onTransferAnnounced: (request: NdxTransferOpRequest, peerAddress: string) => void
}

const UNIMPLEMENTED_TRANSFER_MESSAGE =
  'The real send/receive chunk-streaming engine is not implemented yet (Phase LAN-6).'

/**
 * Real gRPC server implementing the `Warp` transfer service (spec
 * §14–15, Phase LAN-5). `Ping` and `ProcessTransferOpRequest` are real.
 * Every other RPC — most importantly `StartTransfer`, the actual
 * chunk-streaming method — returns a real `UNIMPLEMENTED` status:
 * there is no real bounded-memory streaming, staging, or atomic commit
 * engine behind it yet (Phase LAN-6), and faking a transfer that moves
 * no real bytes would violate this project's no-mock-production rule.
 */
export class LanShareTransferServer {
  private server: grpc.Server | null = null

  async start(port: number, options: LanShareTransferServerOptions): Promise<void> {
    const proto = await loadNdxLanShareProto()
    const serviceCtor = proto.Warp as grpc.ServiceClientConstructor

    const server = new grpc.Server()
    server.addService(serviceCtor.service, {
      Ping: (
        _call: grpc.ServerUnaryCall<unknown, NdxVoidType>,
        callback: grpc.sendUnaryData<NdxVoidType>
      ) => {
        callback(null, { dummy: 0 })
      },
      ProcessTransferOpRequest: (
        call: grpc.ServerUnaryCall<NdxTransferOpRequest, NdxVoidType>,
        callback: grpc.sendUnaryData<NdxVoidType>
      ) => {
        options.onTransferAnnounced(call.request, parsePeerHost(call.getPeer()) ?? call.getPeer())
        callback(null, { dummy: 0 })
      },
      CheckDuplexConnection: unimplemented(),
      WaitingForDuplex: unimplemented(),
      GetRemoteMachineInfo: unimplemented(),
      GetRemoteMachineAvatar: unimplemented(),
      PauseTransferOp: unimplemented(),
      SendTextMessage: unimplemented(),
      StartTransfer: unimplemented(),
      CancelTransferOpRequest: unimplemented(),
      StopTransfer: unimplemented()
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

function unimplemented(): (
  call: grpc.ServerUnaryCall<unknown, unknown> | grpc.ServerWritableStream<unknown, unknown>,
  callback?: grpc.sendUnaryData<unknown>
) => void {
  return (_call, callback) => {
    const error = Object.assign(new Error(UNIMPLEMENTED_TRANSFER_MESSAGE), {
      code: grpc.status.UNIMPLEMENTED,
      details: UNIMPLEMENTED_TRANSFER_MESSAGE,
      metadata: new grpc.Metadata()
    })
    if (callback) {
      callback(error)
      return
    }
    // Streaming responses (`StartTransfer`, `GetRemoteMachineAvatar`)
    // have no callback argument — `call.destroy()` only tears down the
    // local stream without sending a real gRPC status, leaving the
    // client call hanging. Emitting a real `error` event is grpc-js's
    // documented mechanism for a streaming handler to terminate the
    // call with an explicit status.
    ;(_call as grpc.ServerWritableStream<unknown, unknown>).emit('error', error)
  }
}
