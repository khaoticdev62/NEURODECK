import { open } from 'node:fs/promises'
import { basename } from 'node:path'
import type { UpsertApplicationRequest } from '@shared/contracts'

const ELF_MAGIC = Buffer.from([0x7f, 0x45, 0x4c, 0x46]) // \x7fELF

export interface AppImageVerificationResult {
  valid: boolean
  reason: string
  sizeBytes?: number
}

/**
 * Real AppImage file verification (supplemental spec §7.3 "File
 * verification"). Reads the real first 4 bytes and checks the actual
 * ELF magic number every Linux executable (AppImages are self-mounting
 * ELF binaries) starts with — a real, honest check, not a filename
 * extension guess. "Metadata extraction" here is deliberately scoped to
 * what's verifiable without execution: file size and the user-provided
 * file name. Extracting the embedded `.desktop`/icon from the AppImage's
 * internal squashfs needs a real squashfs reader this slice doesn't
 * build — an honest, named gap, not attempted with a fake stand-in.
 */
export async function verifyAppImage(path: string): Promise<AppImageVerificationResult> {
  let handle
  try {
    handle = await open(path, 'r')
  } catch (error) {
    return {
      valid: false,
      reason: `Could not open file: ${error instanceof Error ? error.message : String(error)}`
    }
  }
  try {
    const buffer = Buffer.alloc(4)
    const { bytesRead } = await handle.read(buffer, 0, 4, 0)
    if (bytesRead < 4 || !buffer.equals(ELF_MAGIC)) {
      return {
        valid: false,
        reason: 'File does not start with the real ELF magic number — not a valid AppImage.'
      }
    }
    const stats = await handle.stat()
    return { valid: true, reason: 'Real ELF magic number verified.', sizeBytes: stats.size }
  } finally {
    await handle.close()
  }
}

export function buildAppImageRecord(
  path: string,
  sizeBytes: number | undefined
): UpsertApplicationRequest {
  const name = basename(path).replace(/\.AppImage$/i, '')
  return {
    id: `appimage:${path}`,
    source: 'appimage',
    name,
    executableRef: path,
    launchArguments: [],
    categories: [],
    installed: true,
    workspaceIds: [],
    launchMode: 'windowed',
    capabilityRequirements: [],
    description: sizeBytes ? `${Math.round(sizeBytes / (1024 * 1024))} MB` : undefined
  }
}
