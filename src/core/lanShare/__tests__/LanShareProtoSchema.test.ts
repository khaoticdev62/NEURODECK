import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import protobuf from 'protobufjs'
import { describe, expect, it } from 'vitest'
import { NDX_LAN_SHARE_PROTO_SOURCE } from '../proto/ndxLanShareProtoSource'
import { loadNdxLanShareProto } from '../grpc/loadNdxLanShareProto'

/** Real structural reflection of a parsed `.proto` source — service/RPC/message shapes only, so comment/whitespace differences between the two real copies don't cause a false mismatch. */
function summarize(root: protobuf.Root): unknown {
  const json = root.toJSON()
  return JSON.parse(JSON.stringify(json))
}

describe('LAN Share proto schema', () => {
  it('the embedded TS proto source and the standalone .proto file describe the same real services and messages', async () => {
    const fileSource = await readFile(join(__dirname, '..', 'proto', 'ndxLanShare.proto'), 'utf-8')
    const fromFile = summarize(protobuf.parse(fileSource).root)
    const fromEmbedded = summarize(protobuf.parse(NDX_LAN_SHARE_PROTO_SOURCE).root)
    expect(fromEmbedded).toEqual(fromFile)
  })

  it('exposes both real services with their real RPC methods after loading', async () => {
    const proto = await loadNdxLanShareProto()
    expect(proto.WarpRegistration).toBeDefined()
    expect(proto.Warp).toBeDefined()

    const warpService = (proto.Warp as { service: { [key: string]: unknown } }).service
    for (const method of [
      'CheckDuplexConnection',
      'WaitingForDuplex',
      'GetRemoteMachineInfo',
      'GetRemoteMachineAvatar',
      'ProcessTransferOpRequest',
      'PauseTransferOp',
      'SendTextMessage',
      'StartTransfer',
      'CancelTransferOpRequest',
      'StopTransfer',
      'Ping'
    ]) {
      expect(warpService[method]).toBeDefined()
    }
  })
})
