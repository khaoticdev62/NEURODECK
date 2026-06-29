import { randomUUID } from 'node:crypto'
import { createWriteStream, type WriteStream } from 'node:fs'
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { desktopCapturer } from 'electron'
import type { BeginRecordingRequest, RecordingRecord, RecordingSource } from '@shared/contracts'

export class RecordingNotFoundError extends Error {
  constructor(id: string) {
    super(`Recording "${id}" does not exist or is not open.`)
  }
}

interface OpenRecording {
  id: string
  path: string
  metaPath: string
  stream: WriteStream
  startedAt: number
  bytes: number
  includesMicrophone: boolean
  resolution: BeginRecordingRequest['resolution']
  frameRate: number
}

function metaPathFor(videoPath: string): string {
  return `${videoPath}.json`
}

/**
 * Real Epic X14 Recording (supplemental spec §42.2). Lives in `main/`,
 * not `core/`, matching `ScreenshotService`'s precedent for keeping
 * `electron` imports (here, `desktopCapturer`) out of the pure-Node
 * `core/` layer. The actual `MediaRecorder`/`getUserMedia` capture
 * happens in the renderer (Electron's own documented pattern for
 * `chromeMediaSource: 'desktop'` capture, which cannot run in the
 * main process) — this service only enumerates real capture sources
 * and writes the real chunk stream the renderer sends it to disk via
 * a real, incremental `fs.createWriteStream`, never buffering a whole
 * recording in memory on either side.
 */
export class RecordingService {
  private readonly open = new Map<string, OpenRecording>()

  constructor(private readonly outputDir: string) {}

  async listSources(): Promise<RecordingSource[]> {
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 320, height: 180 }
    })
    return sources.map((source) => ({
      id: source.id,
      name: source.name,
      type: source.id.startsWith('screen') ? 'screen' : 'window',
      thumbnailDataUrl: source.thumbnail.toDataURL()
    }))
  }

  async begin(request: BeginRecordingRequest): Promise<string> {
    await mkdir(this.outputDir, { recursive: true })
    const id = randomUUID()
    const startedAt = Date.now()
    const path = join(this.outputDir, `recording-${startedAt}-${id}.webm`)
    const stream = createWriteStream(path)
    this.open.set(id, {
      id,
      path,
      metaPath: metaPathFor(path),
      stream,
      startedAt,
      bytes: 0,
      includesMicrophone: request.includesMicrophone,
      resolution: request.resolution,
      frameRate: request.frameRate
    })
    return id
  }

  async appendChunk(recordingId: string, chunkBase64: string): Promise<void> {
    const recording = this.open.get(recordingId)
    if (!recording) throw new RecordingNotFoundError(recordingId)
    const buffer = Buffer.from(chunkBase64, 'base64')
    await new Promise<void>((resolve, reject) => {
      recording.stream.write(buffer, (error) => (error ? reject(error) : resolve()))
    })
    recording.bytes += buffer.length
  }

  async finish(recordingId: string): Promise<RecordingRecord> {
    const recording = this.open.get(recordingId)
    if (!recording) throw new RecordingNotFoundError(recordingId)
    await new Promise<void>((resolve, reject) => {
      recording.stream.end((error: unknown) => (error ? reject(error) : resolve()))
    })
    this.open.delete(recordingId)

    const record: RecordingRecord = {
      id: recording.id,
      path: recording.path,
      startedAt: recording.startedAt,
      completedAt: Date.now(),
      bytes: recording.bytes,
      includesMicrophone: recording.includesMicrophone,
      resolution: recording.resolution,
      frameRate: recording.frameRate
    }
    await writeFile(recording.metaPath, JSON.stringify(record, null, 2))
    return record
  }

  async cancel(recordingId: string): Promise<void> {
    const recording = this.open.get(recordingId)
    if (!recording) throw new RecordingNotFoundError(recordingId)
    await new Promise<void>((resolve) => recording.stream.end(() => resolve()))
    this.open.delete(recordingId)
    await rm(recording.path, { force: true })
  }

  async list(): Promise<RecordingRecord[]> {
    await mkdir(this.outputDir, { recursive: true })
    const entries = await readdir(this.outputDir)
    const records: RecordingRecord[] = []
    for (const entry of entries) {
      if (!entry.endsWith('.json')) continue
      try {
        const content = await readFile(join(this.outputDir, entry), 'utf-8')
        records.push(JSON.parse(content) as RecordingRecord)
      } catch {
        // A missing/corrupt sidecar means an interrupted recording — skip it rather than fail the whole list.
      }
    }
    return records.sort((a, b) => b.startedAt - a.startedAt)
  }

  async delete(recordingId: string): Promise<void> {
    const records = await this.list()
    const record = records.find((candidate) => candidate.id === recordingId)
    if (!record) throw new RecordingNotFoundError(recordingId)
    await rm(record.path, { force: true })
    await rm(metaPathFor(record.path), { force: true })
  }
}
