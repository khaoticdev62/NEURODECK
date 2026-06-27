import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { NDX_LAN_SHARE_PROTO_SOURCE } from '../proto/ndxLanShareProtoSource'

let cached: grpc.GrpcObject | null = null

/**
 * Loads the real, clean-room-authored `WarpRegistration` gRPC schema.
 * `@grpc/proto-loader` only reads `.proto` files from disk, and
 * Electron's main-process build does not copy non-JS assets — so the
 * embedded proto source is materialized to a real temp file once, then
 * loaded through the same well-tested file-based API every other
 * grpc-js consumer uses.
 */
export async function loadNdxLanShareProto(): Promise<grpc.GrpcObject> {
  if (cached) return cached

  const dir = await mkdtemp(join(tmpdir(), 'ndx-lan-share-proto-'))
  const filePath = join(dir, 'ndxLanShare.proto')
  await writeFile(filePath, NDX_LAN_SHARE_PROTO_SOURCE, 'utf-8')

  const packageDefinition = protoLoader.loadSync(filePath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  })
  cached = grpc.loadPackageDefinition(packageDefinition)
  return cached
}
