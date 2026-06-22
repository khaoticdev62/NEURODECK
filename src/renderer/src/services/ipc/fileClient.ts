import type {
  FileEntry,
  ListFilesRequest,
  NdxResult,
  ReadFileRequest,
  ReadFileResult,
  WriteFileRequest
} from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

export async function listFiles(request: ListFilesRequest): Promise<NdxResult<FileEntry[]>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.files.list(request)
}

export async function readFile(request: ReadFileRequest): Promise<NdxResult<ReadFileResult>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.files.read(request)
}

export async function writeFile(request: WriteFileRequest): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.files.write(request)
}
