/**
 * Dev signing helper — signs an extension's manifest.json with a real
 * Ed25519 private key and writes the `signature` block back.
 *
 * Usage:
 *   node scripts/sign-extension-manifest.mjs \
 *     --manifest <path/to/manifest.json> \
 *     --key <path/to/private-key.pem>
 *
 * The private key must be an Ed25519 PKCS#8 PEM.
 * To generate a keypair:
 *   node -e "
 *     const {generateKeyPairSync} = require('node:crypto');
 *     const {publicKey, privateKey} = generateKeyPairSync('ed25519');
 *     require('fs').writeFileSync('public-key.pem', publicKey.export({type:'spki',format:'pem'}));
 *     require('fs').writeFileSync('private-key.pem', privateKey.export({type:'pkcs8',format:'pem'}));
 *     console.log('Keys written to public-key.pem and private-key.pem');
 *   "
 *
 * Then register public-key.pem in NeuroDeck's Trusted Publishers screen.
 */

import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const args = process.argv.slice(2)
const argMap = {}
for (let i = 0; i < args.length; i += 2) {
  argMap[args[i].replace('--', '')] = args[i + 1]
}

if (!argMap.manifest || !argMap.key) {
  console.error('Usage: node scripts/sign-extension-manifest.mjs --manifest <path> --key <path>')
  process.exit(1)
}

const manifestPath = resolve(argMap.manifest)
const keyPath = resolve(argMap.key)

const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
const privateKeyPem = readFileSync(keyPath, 'utf-8')
const publicKeyPem = readFileSync(
  keyPath.replace('private', 'public').replace('priv', 'pub'),
  'utf-8'
)
const fingerprint = createHash('sha256').update(publicKeyPem.trim()).digest('hex')

// Canonical payload: manifest without signature field, sorted keys.
/** @returns {unknown} */
function sortKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep)
  if (value !== null && typeof value === 'object') {
    const sorted = {}
    for (const key of Object.keys(value).sort()) sorted[key] = sortKeysDeep(value[key])
    return sorted
  }
  return value
}

const unsigned = { ...manifest }
delete unsigned.signature
const payload = JSON.stringify(sortKeysDeep(unsigned))

const { sign } = await import('node:crypto')
const sigBuffer = sign(null, Buffer.from(payload, 'utf-8'), privateKeyPem)

const signed = {
  ...manifest,
  signature: {
    algorithm: 'ed25519',
    publicKeyFingerprint: fingerprint,
    signature: sigBuffer.toString('base64')
  }
}

writeFileSync(manifestPath, JSON.stringify(signed, null, 2), 'utf-8')
console.log(`Signed manifest written to ${manifestPath}`)
console.log(`  publicKeyFingerprint: ${fingerprint}`)
