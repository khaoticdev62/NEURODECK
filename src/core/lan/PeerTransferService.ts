import { createCipheriv, createDecipheriv, createHash, pbkdf2Sync, randomBytes } from 'node:crypto'
import { createServer, connect, type Server, type Socket } from 'node:net'
import { basename, join } from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'

const PBKDF2_ITERATIONS = 100_000
const AUTH_TAG_LENGTH = 16
const IV_LENGTH = 12
const SALT_LENGTH = 16

export interface ReceivedFile {
  fileName: string
  sizeBytes: number
  sha256: string
  savedPath: string
}

interface TransferHeader {
  fileName: string
  fileSize: number
  saltHex: string
  ivHex: string
}

function deriveKey(pairingCode: string, salt: Buffer): Buffer {
  return pbkdf2Sync(pairingCode, salt, PBKDF2_ITERATIONS, 32, 'sha256')
}

/** Real filename sanitization (supplemental §19.3) — strips any directory component so a malicious peer's `fileName` can never traverse outside the destination directory. */
function sanitizeFileName(fileName: string): string {
  const base = basename(fileName).trim()
  return base.length > 0 ? base : 'received-file'
}

/**
 * Real Epic X6 peer transfer (supplemental §19.2/§19.3) — file bytes
 * are encrypted with real AES-256-GCM (authenticated encryption: a
 * wrong pairing code produces a real, detectable decryption failure,
 * not silently-wrong output) using a key derived via real PBKDF2 from
 * a pre-shared pairing code the user enters on both devices out of
 * band. This is real, working confidentiality+integrity over plain
 * TCP — not full mutual TLS/X.509 (see the ledger for why). Honest
 * scope: the whole file is buffered in memory for one-shot AEAD
 * encryption/decryption — fine for typical file-transfer sizes, not
 * optimized for huge multi-GB transfers, which would need a real
 * chunked-AEAD framing this slice doesn't build.
 */
export class PeerTransferService {
  private server: Server | null = null

  /** Listens once for a single real incoming transfer, decrypts and writes it to `destinationDir`, then closes. */
  listenOnce(port: number, destinationDir: string, pairingCode: string): Promise<ReceivedFile> {
    return new Promise((resolve, reject) => {
      const server = createServer((socket: Socket) => {
        const chunks: Buffer[] = []
        socket.on('data', (chunk) => chunks.push(chunk))
        socket.on('end', () => {
          const run = async (): Promise<void> => {
            try {
              const result = await this.handleConnection(
                Buffer.concat(chunks),
                destinationDir,
                pairingCode
              )
              resolve(result)
            } catch (error) {
              reject(error)
            } finally {
              server.close()
            }
          }
          run().catch(() => undefined)
        })
        socket.on('error', (error) => reject(error))
      })
      server.on('error', reject)
      server.listen(port, () => {
        this.server = server
      })
    })
  }

  stop(): void {
    this.server?.close()
    this.server = null
  }

  private async handleConnection(
    raw: Buffer,
    destinationDir: string,
    pairingCode: string
  ): Promise<ReceivedFile> {
    const headerEnd = raw.indexOf('\n')
    if (headerEnd === -1) throw new Error('Malformed transfer: no header found.')
    const header = JSON.parse(raw.subarray(0, headerEnd).toString('utf-8')) as TransferHeader
    const body = raw.subarray(headerEnd + 1)
    const ciphertext = body.subarray(0, body.length - AUTH_TAG_LENGTH)
    const authTag = body.subarray(body.length - AUTH_TAG_LENGTH)

    const salt = Buffer.from(header.saltHex, 'hex')
    const iv = Buffer.from(header.ivHex, 'hex')
    const key = deriveKey(pairingCode, salt)

    let plaintext: Buffer
    try {
      const decipher = createDecipheriv('aes-256-gcm', key, iv)
      decipher.setAuthTag(authTag)
      plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
    } catch {
      throw new Error('Transfer rejected: pairing code did not authenticate this transfer.')
    }

    const fileName = sanitizeFileName(header.fileName)
    const savedPath = join(destinationDir, fileName)
    await writeFile(savedPath, plaintext)

    return {
      fileName,
      sizeBytes: plaintext.length,
      sha256: createHash('sha256').update(plaintext).digest('hex'),
      savedPath
    }
  }

  /** Real client-side send — connects, encrypts, transfers, and reports the real SHA-256 of what it sent. */
  async sendFile(
    host: string,
    port: number,
    filePath: string,
    pairingCode: string
  ): Promise<{ sha256: string; sizeBytes: number }> {
    const plaintext = await readFile(filePath)
    const salt = randomBytes(SALT_LENGTH)
    const iv = randomBytes(IV_LENGTH)
    const key = deriveKey(pairingCode, salt)

    const cipher = createCipheriv('aes-256-gcm', key, iv)
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
    const authTag = cipher.getAuthTag()

    const header: TransferHeader = {
      fileName: basename(filePath),
      fileSize: plaintext.length,
      saltHex: salt.toString('hex'),
      ivHex: iv.toString('hex')
    }
    const payload = Buffer.concat([
      Buffer.from(`${JSON.stringify(header)}\n`, 'utf-8'),
      ciphertext,
      authTag
    ])

    await new Promise<void>((resolve, reject) => {
      const socket = connect(port, host, () => {
        socket.end(payload)
      })
      socket.on('close', resolve)
      socket.on('error', reject)
    })

    return {
      sha256: createHash('sha256').update(plaintext).digest('hex'),
      sizeBytes: plaintext.length
    }
  }
}
