import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, readdir, rename, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import type { BackupRecord, BackupVerification, CreateBackupRequest } from '@shared/contracts'

const SCHEMA_VERSION = '1.0.0'
const BACKUP_EXTENSION = '.ndx-backup.json'

const INCLUDED_APP_STATE_FILES = [
  'workspaces.json',
  'applications.json',
  'devices.json',
  'extensions.json',
  'knowledge.json',
  'memory.json',
  'prompt-templates.json',
  'personas.json',
  'snippets.json',
  'controller-settings.json',
  'display-settings.json',
  'browser-tabs.json',
  'browser-permissions.json',
  'lan-peers.json',
  'lan-share-identity.json',
  'lan-share-settings.json',
  'lan-share-peers.json',
  'lan-share-transfer-jobs.json'
] as const

const SECRET_EXCLUDED_FILES = [
  'model-providers.json',
  'remote-hosts.json',
  'clipboard.json',
  'lock-settings.json',
  'device-identity.json',
  'lan-share-certificate.json',
  'lan-share-group-code.json'
] as const

interface BackupFileEntry {
  relativePath: string
  content: string
  bytes: number
  sha256: string
}

interface BackupBundlePayload {
  schemaVersion: typeof SCHEMA_VERSION
  id: string
  createdAt: number
  label?: string
  scope: 'app-state'
  files: BackupFileEntry[]
  excludedSecretPaths: string[]
}

interface BackupBundle extends BackupBundlePayload {
  sha256: string
}

/**
 * Epic X7 local backup foundation. This intentionally backs up only
 * non-secret JSON app-state files under Electron's userData directory.
 * Secret-bearing stores remain excluded because their values are encrypted
 * against this machine's safeStorage boundary and should not be exported as
 * portable backup content until the vault/identity epic defines a restore
 * policy for them.
 */
export class BackupService {
  constructor(
    private readonly userDataPath: string,
    private readonly backupDir: string
  ) {}

  async create(request: CreateBackupRequest = {}): Promise<BackupRecord> {
    await mkdir(this.backupDir, { recursive: true })
    const id = randomUUID()
    const createdAt = Date.now()
    const files: BackupFileEntry[] = []

    for (const relativePath of INCLUDED_APP_STATE_FILES) {
      const fullPath = join(this.userDataPath, relativePath)
      if (!(await isFile(fullPath))) continue
      const content = await readFile(fullPath, 'utf-8')
      files.push({
        relativePath,
        content,
        bytes: Buffer.byteLength(content, 'utf-8'),
        sha256: sha256(content)
      })
    }

    const payload: BackupBundlePayload = {
      schemaVersion: SCHEMA_VERSION,
      id,
      createdAt,
      label: request.label,
      scope: 'app-state',
      files,
      excludedSecretPaths: [...SECRET_EXCLUDED_FILES]
    }
    const bundle: BackupBundle = {
      ...payload,
      sha256: bundleSha(payload)
    }
    const path = this.pathFor(id)
    await writeAtomic(path, JSON.stringify(bundle, null, 2))
    return toRecord(bundle, path, true)
  }

  async list(): Promise<BackupRecord[]> {
    let entries: string[]
    try {
      entries = await readdir(this.backupDir)
    } catch (error) {
      if (isNotFound(error)) return []
      throw error
    }

    const records = await Promise.all(
      entries
        .filter((entry) => entry.endsWith(BACKUP_EXTENSION))
        .map(async (entry): Promise<BackupRecord | null> => {
          const path = join(this.backupDir, entry)
          try {
            const bundle = parseBundle(await readFile(path, 'utf-8'))
            return toRecord(bundle, path, bundle.sha256 === bundleSha(stripSha(bundle)))
          } catch {
            return null
          }
        })
    )
    return records
      .filter((record): record is BackupRecord => record !== null)
      .sort((a, b) => b.createdAt - a.createdAt)
  }

  async verify(id: string): Promise<BackupVerification> {
    const checkedAt = Date.now()
    try {
      const path = this.pathFor(id)
      const bundle = parseBundle(await readFile(path, 'utf-8'))
      const failures: string[] = []

      if (bundle.id !== id) failures.push('The backup id does not match its filename.')
      if (bundle.sha256 !== bundleSha(stripSha(bundle))) {
        failures.push('The backup manifest hash does not match its content.')
      }

      for (const file of bundle.files) {
        if (file.bytes !== Buffer.byteLength(file.content, 'utf-8')) {
          failures.push(`${file.relativePath} has a byte-count mismatch.`)
        }
        if (file.sha256 !== sha256(file.content)) {
          failures.push(`${file.relativePath} has a SHA-256 mismatch.`)
        }
      }

      return {
        id,
        checkedAt,
        ok: failures.length === 0,
        failures,
        record: toRecord(bundle, path, failures.length === 0)
      }
    } catch (error) {
      return {
        id,
        checkedAt,
        ok: false,
        failures: [error instanceof Error ? error.message : 'Backup verification failed.']
      }
    }
  }

  private pathFor(id: string): string {
    return join(this.backupDir, `${basename(id)}${BACKUP_EXTENSION}`)
  }
}

function parseBundle(raw: string): BackupBundle {
  const value = JSON.parse(raw) as BackupBundle
  if (
    value.schemaVersion !== SCHEMA_VERSION ||
    typeof value.id !== 'string' ||
    typeof value.createdAt !== 'number' ||
    value.scope !== 'app-state' ||
    !Array.isArray(value.files) ||
    !Array.isArray(value.excludedSecretPaths) ||
    typeof value.sha256 !== 'string'
  ) {
    throw new Error('Invalid backup bundle.')
  }
  return value
}

function stripSha(bundle: BackupBundle): BackupBundlePayload {
  return {
    schemaVersion: bundle.schemaVersion,
    id: bundle.id,
    createdAt: bundle.createdAt,
    label: bundle.label,
    scope: bundle.scope,
    files: bundle.files,
    excludedSecretPaths: bundle.excludedSecretPaths
  }
}

function bundleSha(payload: BackupBundlePayload): string {
  return sha256(JSON.stringify(payload))
}

function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex')
}

function toRecord(bundle: BackupBundle, path: string, verified: boolean): BackupRecord {
  return {
    id: bundle.id,
    schemaVersion: bundle.schemaVersion,
    createdAt: bundle.createdAt,
    label: bundle.label,
    scope: bundle.scope,
    path,
    fileCount: bundle.files.length,
    totalBytes: bundle.files.reduce((total, file) => total + file.bytes, 0),
    sha256: bundle.sha256,
    verified,
    excludedSecretPaths: bundle.excludedSecretPaths
  }
}

async function writeAtomic(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const tempPath = `${path}.${process.pid}.${randomUUID()}.tmp`
  await writeFile(tempPath, content, 'utf-8')
  await rename(tempPath, path)
}

async function isFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile()
  } catch (error) {
    if (isNotFound(error)) return false
    throw error
  }
}

function isNotFound(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'
}
