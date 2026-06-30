/**
 * Real Epic X15 SBOM generation (supplemental §39 "SBOM generation" /
 * "License inventory"). Produces a CycloneDX-lite JSON artifact from the
 * real `package-lock.json` — no external tool dependency, no fabricated
 * package inventory. Lockfile v3 (npm workspaces) format.
 *
 * Usage:
 *   node scripts/generate-sbom.mjs [--prod-only]
 *
 * Output:
 *   docs/security/sbom.json
 */

import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const dir = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const lockfilePath = resolve(dir, 'package-lock.json')
const packageJsonPath = resolve(dir, 'package.json')
const outputDir = resolve(dir, 'docs', 'security')
const outputPath = resolve(outputDir, 'sbom.json')

const prodOnly = process.argv.includes('--prod-only')

const lockfile = JSON.parse(readFileSync(lockfilePath, 'utf-8'))
const meta = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))

if (lockfile.lockfileVersion !== 3) {
  console.error(`Unsupported lockfile version: ${lockfile.lockfileVersion} (expected 3)`)
  process.exit(1)
}

const components = []

for (const [key, pkg] of Object.entries(lockfile.packages)) {
  if (!key) continue // skip the root ''
  if (prodOnly && pkg.dev) continue

  const name = key.replace(/^node_modules\//, '').replace(/\/node_modules\//g, '/')
  const version = pkg.version ?? 'unknown'
  const resolved = pkg.resolved ?? null
  const license = pkg.license ?? pkg.licenses ?? 'UNKNOWN'
  const isDev = pkg.dev === true

  const component = {
    type: 'library',
    name,
    version,
    isDev,
    license: Array.isArray(license) ? license.join(' OR ') : String(license),
    purl: `pkg:npm/${encodeURIComponent(name)}@${encodeURIComponent(version)}`
  }

  if (resolved) {
    const integrityHash = pkg.integrity
    if (integrityHash) {
      const [algorithm, hash] = integrityHash.split('-')
      component.hashes = [{ algorithm: algorithm.toUpperCase(), content: hash }]
    }
    component.resolved = resolved
  }

  components.push(component)
}

components.sort((a, b) => (a.isDev === b.isDev ? a.name.localeCompare(b.name) : a.isDev ? 1 : -1))

const sbom = {
  bomFormat: 'CycloneDX-lite',
  specVersion: '1.4',
  version: 1,
  serialNumber: `urn:uuid:ndx-sbom-${createHash('sha256')
    .update(`${meta.name}@${meta.version}`)
    .update(String(Date.now()))
    .digest('hex')
    .slice(0, 32)}`,
  metadata: {
    timestamp: new Date().toISOString(),
    component: {
      type: 'application',
      name: meta.name,
      version: meta.version
    },
    generatedBy: 'scripts/generate-sbom.mjs (node:crypto, no third-party tooling)',
    prodOnly
  },
  components
}

mkdirSync(outputDir, { recursive: true })
writeFileSync(outputPath, JSON.stringify(sbom, null, 2), 'utf-8')

const total = components.length
const prodCount = components.filter((c) => !c.isDev).length
const devCount = components.filter((c) => c.isDev).length
const licenses = new Set(components.map((c) => c.license)).size

console.log(`SBOM generated: ${outputPath}`)
console.log(`  ${total} packages (${prodCount} production, ${devCount} dev)`)
console.log(`  ${licenses} distinct license expressions`)
