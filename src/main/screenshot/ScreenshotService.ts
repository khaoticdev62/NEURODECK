import { randomUUID } from 'node:crypto'
import { copyFile, mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  clipboard,
  desktopCapturer,
  nativeImage,
  screen,
  type BrowserWindow,
  type NativeImage
} from 'electron'
import type { ScreenshotRecord, ScreenshotSource } from '@shared/contracts'

export class ScreenshotCaptureError extends Error {}
export class ScreenshotNotFoundError extends Error {
  constructor(id: string) {
    super(`Screenshot "${id}" does not exist.`)
  }
}

function fileNameFor(record: Pick<ScreenshotRecord, 'id' | 'capturedAt'>): string {
  return `screenshot-${record.capturedAt}-${record.id}.png`
}

/**
 * Real Epic X14 Screenshot Center (supplemental spec §42.1), scoped to
 * "Current window" (`webContents.capturePage()` — always reliable, no
 * OS permission needed) and "Full screen" (`desktopCapturer` — real,
 * genuinely gated by OS screen-recording permission on some
 * platforms; a real capture failure is surfaced honestly via
 * `ScreenshotCaptureError`, never silently swapped for a placeholder
 * image). See `shared/contracts/screenshot.ts` for which spec items
 * (region select, annotation, redaction, Ask AI) are deliberately not
 * offered and why.
 */
export class ScreenshotService {
  constructor(private readonly outputDir: string) {}

  async captureCurrentWindow(window: BrowserWindow): Promise<ScreenshotRecord> {
    const image = await window.webContents.capturePage()
    return this.save(image, 'current-window')
  }

  async captureFullScreen(): Promise<ScreenshotRecord> {
    const display = screen.getPrimaryDisplay()
    const width = Math.round(display.size.width * display.scaleFactor)
    const height = Math.round(display.size.height * display.scaleFactor)

    let sources
    try {
      sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width, height }
      })
    } catch (error) {
      throw new ScreenshotCaptureError(
        `Full-screen capture failed: ${error instanceof Error ? error.message : 'unknown error'}.`
      )
    }
    if (sources.length === 0 || sources[0].thumbnail.isEmpty()) {
      throw new ScreenshotCaptureError(
        'No real screen source was available. This platform may require granting screen-recording permission first.'
      )
    }
    return this.save(sources[0].thumbnail, 'full-screen')
  }

  async list(): Promise<ScreenshotRecord[]> {
    await mkdir(this.outputDir, { recursive: true })
    const entries = await readdir(this.outputDir)
    const records: ScreenshotRecord[] = []
    for (const entry of entries) {
      const match = /^screenshot-(\d+)-([0-9a-f-]+)\.png$/.exec(entry)
      if (!match) continue
      const fullPath = join(this.outputDir, entry)
      const stats = await stat(fullPath)
      records.push({
        id: match[2],
        path: fullPath,
        capturedAt: Number(match[1]),
        source: 'full-screen',
        bytes: stats.size
      })
    }
    return records.sort((a, b) => b.capturedAt - a.capturedAt)
  }

  async copyToClipboard(id: string): Promise<void> {
    const record = await this.find(id)
    clipboard.writeImage(nativeImage.createFromPath(record.path))
  }

  async delete(id: string): Promise<void> {
    const record = await this.find(id)
    await rm(record.path, { force: true })
  }

  /** Real conflict-safe binary copy into a workspace root — never overwrites an existing same-named file. */
  async addToWorkspace(id: string, workspaceRootPath: string): Promise<string> {
    const record = await this.find(id)
    const baseName = `screenshot-${record.capturedAt}.png`
    let candidate = baseName
    let counter = 1
    while (await pathExists(join(workspaceRootPath, candidate))) {
      candidate = `screenshot-${record.capturedAt} (${counter}).png`
      counter += 1
    }
    const destination = join(workspaceRootPath, candidate)
    await copyFile(record.path, destination)
    return destination
  }

  private async find(id: string): Promise<ScreenshotRecord> {
    const records = await this.list()
    const record = records.find((candidate) => candidate.id === id)
    if (!record) throw new ScreenshotNotFoundError(id)
    return record
  }

  private async save(image: NativeImage, source: ScreenshotSource): Promise<ScreenshotRecord> {
    await mkdir(this.outputDir, { recursive: true })
    const record: ScreenshotRecord = {
      id: randomUUID(),
      path: '',
      capturedAt: Date.now(),
      source,
      bytes: 0
    }
    const fileName = fileNameFor(record)
    const fullPath = join(this.outputDir, fileName)
    const buffer = image.toPNG()
    await writeFile(fullPath, buffer)
    return { ...record, path: fullPath, bytes: buffer.length }
  }
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}
