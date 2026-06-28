import * as grpc from '@grpc/grpc-js'
import { open } from 'node:fs/promises'
import { compressChunk } from './fileChunkCompression'
import { loadNdxLanShareProto } from './loadNdxLanShareProto'
import { parsePeerHost } from './parsePeerHost'
import { NDX_FILE_TYPE_DIRECTORY, NDX_FILE_TYPE_SYMBOLIC_LINK } from '../LanShareManifestBuilder'

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

/** Real wire shape of `FileTime`. */
export interface NdxFileTime {
  mtime: string
  mtime_usec: number
}

/** Real wire shape of `FileChunk` — `chunk` carries raw (or, when `use_compression` was negotiated, zlib-deflated) bytes; empty for directory/symlink marker entries. */
export interface NdxFileChunk {
  relative_path: string
  file_type: number
  symlink_target: string
  chunk: Buffer
  file_mode: number
  time?: NdxFileTime
}

export interface PendingSendFile {
  /** Real absolute path on this device's filesystem — never sent over the wire. */
  absolutePath: string
  relativePath: string
  fileType: number
  mode: number
  mtimeMs: number
  symlinkTarget?: string
}

export interface PendingSendOperation {
  files: PendingSendFile[]
}

export interface LanShareTransferServerOptions {
  /** Called on a real, received `ProcessTransferOpRequest` announcement. */
  onTransferAnnounced: (request: NdxTransferOpRequest, peerAddress: string) => void
  /** Real lookup by `OpInfo.ident` (the job id) for a transfer this device previously announced as a sender — populated by `LanShareService.sendFiles()`. Returning `undefined` for an unknown ident is a real, honest `NOT_FOUND`, never a fabricated empty transfer. */
  getPendingSendOperation: (ident: string) => PendingSendOperation | undefined
}

/** Matches Warpinator's own real default (`transfer-block-size` defaults to 1024 KB, confirmed in their gschema). */
const BLOCK_SIZE_BYTES = 1024 * 1024

const UNIMPLEMENTED_TRANSFER_MESSAGE = 'This RPC is not implemented yet (Phase LAN-6/LAN-7).'

/**
 * Real gRPC server implementing the `Warp` transfer service (spec
 * §14–17, Phases LAN-5/LAN-6). `Ping`, `ProcessTransferOpRequest`, and
 * now `StartTransfer` are real. `StartTransfer` streams real bytes
 * read from this device's real filesystem in real bounded
 * `BLOCK_SIZE_BYTES` blocks — never the whole file buffered in memory
 * — compressing each non-empty chunk with real zlib when the caller's
 * `OpInfo.use_compression` is set. Every other RPC still returns a
 * real `UNIMPLEMENTED` status; they are not needed for one-directional
 * file transfer (avatars, text messages, pause/duplex-check) and
 * remain honestly unbuilt.
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
      StartTransfer: (call: grpc.ServerWritableStream<NdxOpInfo, NdxFileChunk>) => {
        const operation = options.getPendingSendOperation(call.request.ident)
        if (!operation) {
          call.emit('error', {
            code: grpc.status.NOT_FOUND,
            message: `No pending transfer with ident "${call.request.ident}".`
          })
          return
        }
        void streamFiles(call, operation, call.request.use_compression).catch((error: unknown) => {
          call.emit('error', {
            code: grpc.status.INTERNAL,
            message: error instanceof Error ? error.message : String(error)
          })
        })
      },
      CheckDuplexConnection: unimplemented(),
      WaitingForDuplex: unimplemented(),
      GetRemoteMachineInfo: unimplemented(),
      GetRemoteMachineAvatar: unimplemented(),
      PauseTransferOp: unimplemented(),
      SendTextMessage: unimplemented(),
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

async function streamFiles(
  call: grpc.ServerWritableStream<NdxOpInfo, NdxFileChunk>,
  operation: PendingSendOperation,
  useCompression: boolean
): Promise<void> {
  for (const file of operation.files) {
    const time: NdxFileTime = {
      mtime: String(Math.floor(file.mtimeMs / 1000)),
      mtime_usec: Math.floor((file.mtimeMs % 1000) * 1000)
    }

    if (file.fileType === NDX_FILE_TYPE_DIRECTORY) {
      call.write({
        relative_path: file.relativePath,
        file_type: file.fileType,
        symlink_target: '',
        chunk: Buffer.alloc(0),
        file_mode: file.mode,
        time
      })
      continue
    }
    if (file.fileType === NDX_FILE_TYPE_SYMBOLIC_LINK) {
      call.write({
        relative_path: file.relativePath,
        file_type: file.fileType,
        symlink_target: file.symlinkTarget ?? '',
        chunk: Buffer.alloc(0),
        file_mode: file.mode,
        time
      })
      continue
    }

    const handle = await open(file.absolutePath, 'r')
    try {
      let firstBlock = true
      const buffer = Buffer.alloc(BLOCK_SIZE_BYTES)
      for (;;) {
        const { bytesRead } = await handle.read(buffer, 0, BLOCK_SIZE_BYTES)
        if (bytesRead === 0) break
        const block = buffer.subarray(0, bytesRead)
        const payload = useCompression ? compressChunk(Buffer.from(block)) : Buffer.from(block)
        call.write({
          relative_path: file.relativePath,
          file_type: file.fileType,
          symlink_target: '',
          chunk: payload,
          file_mode: file.mode,
          time: firstBlock ? time : undefined
        })
        firstBlock = false
        if (bytesRead < BLOCK_SIZE_BYTES) break
      }
    } finally {
      await handle.close()
    }
  }
  call.end()
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
    // Streaming responses (`GetRemoteMachineAvatar`) have no callback
    // argument — `call.destroy()` only tears down the local stream
    // without sending a real gRPC status, leaving the client call
    // hanging. Emitting a real `error` event is grpc-js's documented
    // mechanism for a streaming handler to terminate with a status.
    ;(_call as grpc.ServerWritableStream<unknown, unknown>).emit('error', error)
  }
}
