import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import type {
  BackupMigrationRecord,
  BackupMigrationReport,
  BackupRecord,
  BackupRestoreResult,
  BackupVerification,
  CreateBackupRequest
} from '@shared/contracts'

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

interface LegacyBackup09Bundle {
  schemaVersion: '0.9.0'
  id: string
  createdAt: number
  label?: string
  scope: 'app-state'
  files: Array<{
    relativePath: string
    content: string
  }>
  excludedSecretPaths?: string[]
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
      const failures = verifyBundle(bundle, id)

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

  async restore(id: string): Promise<BackupRestoreResult> {
    const bundle = await this.readVerifiedBundle(id)
    const rollback = await this.create({ label: `Rollback before restoring ${bundle.label ?? id}` })

    try {
      const result = await this.restoreBundle(bundle)
      return {
        restoredBackupId: id,
        restoredFileCount: result.restoredFileCount,
        removedFileCount: result.removedFileCount,
        rollbackBackupId: rollback.id,
        rollbackBackupPath: rollback.path
      }
    } catch (error) {
      const rollbackBundle = await this.readVerifiedBundle(rollback.id)
      await this.restoreBundle(rollbackBundle)
      throw error
    }
  }

  async importFromPath(path: string): Promise<BackupRecord> {
    const bundle = parseBundle(await readFile(path, 'utf-8'))
    const failures = verifyBundle(bundle, bundle.id)
    if (failures.length > 0) {
      throw new Error(`Backup failed verification: ${failures.join(' ')}`)
    }
    const destination = this.pathFor(bundle.id)
    await writeAtomic(destination, JSON.stringify(bundle, null, 2))
    return toRecord(bundle, destination, true)
  }

  async migrateManagedBackups(): Promise<BackupMigrationReport> {
    const checkedAt = Date.now()
    let entries: string[]
    try {
      entries = await readdir(this.backupDir)
    } catch (error) {
      if (isNotFound(error)) {
        return summarizeMigrationRecords(checkedAt, [])
      }
      throw error
    }

    const records: BackupMigrationRecord[] = []
    for (const entry of entries.filter((name) => name.endsWith(BACKUP_EXTENSION))) {
      const path = join(this.backupDir, entry)
      records.push(await this.migrateBackupFile(path, checkedAt))
    }
    return summarizeMigrationRecords(checkedAt, records)
  }

  private pathFor(id: string): string {
    return join(this.backupDir, `${basename(id)}${BACKUP_EXTENSION}`)
  }

  private async readVerifiedBundle(id: string): Promise<BackupBundle> {
    const bundle = parseBundle(await readFile(this.pathFor(id), 'utf-8'))
    const failures = verifyBundle(bundle, id)
    if (failures.length > 0) {
      throw new Error(`Backup failed verification: ${failures.join(' ')}`)
    }
    return bundle
  }

  private async restoreBundle(
    bundle: BackupBundle
  ): Promise<{ restoredFileCount: number; removedFileCount: number }> {
    const restoredPaths = new Set(bundle.files.map((file) => file.relativePath))
    let restoredFileCount = 0
    let removedFileCount = 0

    for (const file of bundle.files) {
      await writeAtomic(join(this.userDataPath, file.relativePath), file.content)
      restoredFileCount += 1
    }

    for (const relativePath of INCLUDED_APP_STATE_FILES) {
      if (restoredPaths.has(relativePath)) continue
      const fullPath = join(this.userDataPath, relativePath)
      if (!(await isFile(fullPath))) continue
      await rm(fullPath, { force: true })
      removedFileCount += 1
    }

    return { restoredFileCount, removedFileCount }
  }

  private async migrateBackupFile(
    path: string,
    migratedAt: number
  ): Promise<BackupMigrationRecord> {
    let raw: string
    try {
      raw = await readFile(path, 'utf-8')
    } catch (error) {
      return migrationRecord(path, 'invalid', readErrorMessage(error), migratedAt)
    }

    let value: unknown
    try {
      value = JSON.parse(raw)
    } catch {
      return migrationRecord(path, 'invalid', 'The backup file is not valid JSON.', migratedAt)
    }

    if (isCurrentBackupBundle(value)) {
      const failures = verifyBundle(value, value.id)
      if (failures.length > 0) {
        return migrationRecord(path, 'invalid', failures.join(' '), migratedAt, value)
      }
      return migrationRecord(
        path,
        'current',
        'Backup schema is already current.',
        migratedAt,
        value
      )
    }

    if (isLegacyBackup09Bundle(value)) {
      const migrated = migrateLegacy09Bundle(value)
      await writeAtomic(path, JSON.stringify(migrated, null, 2))
      return migrationRecord(
        path,
        'migrated',
        'Migrated backup bundle from schema 0.9.0 to 1.0.0.',
        migratedAt,
        migrated,
        '0.9.0'
      )
    }

    const version =
      typeof value === 'object' &&
      value !== null &&
      'schemaVersion' in value &&
      typeof value.schemaVersion === 'string'
        ? value.schemaVersion
        : undefined
    return {
      path,
      fromSchemaVersion: version,
      toSchemaVersion: SCHEMA_VERSION,
      status: 'blocked',
      message: version
        ? `No migration is registered for backup schema ${version}.`
        : 'The backup file does not declare a schema version.',
      migratedAt
    }
  }
}

function isCurrentBackupBundle(value: unknown): value is BackupBundle {
  return (
    typeof value === 'object' &&
    value !== null &&
    'schemaVersion' in value &&
    value.schemaVersion === SCHEMA_VERSION &&
    'id' in value &&
    typeof value.id === 'string' &&
    'sha256' in value &&
    typeof value.sha256 === 'string' &&
    'files' in value &&
    Array.isArray(value.files)
  )
}

function isLegacyBackup09Bundle(value: unknown): value is LegacyBackup09Bundle {
  return (
    typeof value === 'object' &&
    value !== null &&
    'schemaVersion' in value &&
    value.schemaVersion === '0.9.0' &&
    'id' in value &&
    typeof value.id === 'string' &&
    'createdAt' in value &&
    typeof value.createdAt === 'number' &&
    'scope' in value &&
    value.scope === 'app-state' &&
    'files' in value &&
    Array.isArray(value.files) &&
    value.files.every(
      (file) =>
        typeof file === 'object' &&
        file !== null &&
        'relativePath' in file &&
        typeof file.relativePath === 'string' &&
        'content' in file &&
        typeof file.content === 'string'
    )
  )
}

function migrateLegacy09Bundle(bundle: LegacyBackup09Bundle): BackupBundle {
  const payload: BackupBundlePayload = {
    schemaVersion: SCHEMA_VERSION,
    id: bundle.id,
    createdAt: bundle.createdAt,
    label: bundle.label,
    scope: bundle.scope,
    files: bundle.files.map((file) => ({
      relativePath: file.relativePath,
      content: file.content,
      bytes: Buffer.byteLength(file.content, 'utf-8'),
      sha256: sha256(file.content)
    })),
    excludedSecretPaths: bundle.excludedSecretPaths ?? [...SECRET_EXCLUDED_FILES]
  }
  return {
    ...payload,
    sha256: bundleSha(payload)
  }
}

function summarizeMigrationRecords(
  checkedAt: number,
  records: BackupMigrationRecord[]
): BackupMigrationReport {
  return {
    checkedAt,
    total: records.length,
    current: records.filter((record) => record.status === 'current').length,
    migrated: records.filter((record) => record.status === 'migrated').length,
    invalid: records.filter((record) => record.status === 'invalid').length,
    blocked: records.filter((record) => record.status === 'blocked').length,
    records
  }
}

function migrationRecord(
  path: string,
  status: BackupMigrationRecord['status'],
  message: string,
  migratedAt: number,
  bundle?: BackupBundle,
  fromSchemaVersion: string | undefined = bundle?.schemaVersion
): BackupMigrationRecord {
  return {
    path,
    backupId: bundle?.id,
    fromSchemaVersion,
    toSchemaVersion: SCHEMA_VERSION,
    status,
    message,
    migratedAt
  }
}

function readErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Could not read backup file.'
}

function verifyBundle(bundle: BackupBundle, id: string): string[] {
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

  return failures
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
