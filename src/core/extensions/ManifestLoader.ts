import { readFile } from 'node:fs/promises'
import { isAbsolute, join, normalize, resolve } from 'node:path'
import { extensionManifestSchema, type NdxExtensionManifest } from '@shared/contracts'

export interface ManifestLoadResult {
  valid: boolean
  manifest?: NdxExtensionManifest
  reason?: string
}

/**
 * Real Epic X3 manifest validation (supplemental spec §9.2/§10.3
 * "Manifest verification" / "Archive traversal protection"). Reads the
 * extension's real `manifest.json`, validates it against the real Zod
 * schema (never a partial/loose parse), and confirms the declared
 * entrypoint actually resolves inside the extension's own real install
 * directory — a manifest declaring `entrypoints.main: "../../../etc/passwd"`
 * is rejected here, before `ExtensionHost` ever forks a process for it.
 */
export async function loadManifest(installPath: string): Promise<ManifestLoadResult> {
  let raw: string
  try {
    raw = await readFile(join(installPath, 'manifest.json'), 'utf-8')
  } catch (error) {
    return {
      valid: false,
      reason: `Could not read manifest.json: ${error instanceof Error ? error.message : String(error)}`
    }
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(raw)
  } catch {
    return { valid: false, reason: 'manifest.json is not valid JSON.' }
  }

  const parsed = extensionManifestSchema.safeParse(parsedJson)
  if (!parsed.success) {
    return {
      valid: false,
      reason: `manifest.json failed schema validation: ${parsed.error.issues[0]?.message ?? 'invalid manifest'}`
    }
  }

  const resolvedInstallPath = resolve(installPath)
  const entryPath = normalize(join(resolvedInstallPath, parsed.data.entrypoints.main))
  if (isAbsolute(parsed.data.entrypoints.main) || !entryPath.startsWith(resolvedInstallPath)) {
    return { valid: false, reason: 'Entrypoint path escapes the extension install directory.' }
  }

  return { valid: true, manifest: parsed.data }
}
