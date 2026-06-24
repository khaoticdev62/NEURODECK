import { z } from 'zod'

export const terminalSessionStatusSchema = z.enum(['running', 'exited'])
export type TerminalSessionStatus = z.infer<typeof terminalSessionStatusSchema>

export const terminalSessionSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().min(1),
  shell: z.string(),
  cwd: z.string(),
  pid: z.number().int().nonnegative(),
  cols: z.number().int().positive(),
  rows: z.number().int().positive(),
  createdAt: z.number().int().nonnegative(),
  status: terminalSessionStatusSchema,
  exitCode: z.number().int().nullable()
})
export type TerminalSession = z.infer<typeof terminalSessionSchema>

export const createTerminalRequestSchema = z.object({
  workspaceId: z.string().min(1),
  relativeCwd: z.string().max(1024).optional(),
  cols: z.number().int().min(20).max(300).default(100),
  rows: z.number().int().min(5).max(120).default(30)
})
export type CreateTerminalRequest = z.input<typeof createTerminalRequestSchema>

export const terminalSessionRequestSchema = z.object({ sessionId: z.string().uuid() })
export type TerminalSessionRequest = z.infer<typeof terminalSessionRequestSchema>

export const terminalWriteRequestSchema = terminalSessionRequestSchema.extend({
  data: z.string().max(64 * 1024)
})
export type TerminalWriteRequest = z.infer<typeof terminalWriteRequestSchema>

export const terminalResizeRequestSchema = terminalSessionRequestSchema.extend({
  cols: z.number().int().min(20).max(300),
  rows: z.number().int().min(5).max(120)
})
export type TerminalResizeRequest = z.infer<typeof terminalResizeRequestSchema>

export const listTerminalSessionsRequestSchema = z.object({ workspaceId: z.string().min(1) })
export type ListTerminalSessionsRequest = z.infer<typeof listTerminalSessionsRequestSchema>

export const headlessTerminalRequestSchema = z.object({
  workspaceId: z.string().min(1),
  command: z.string().min(1).max(8192),
  relativeCwd: z.string().max(1024).optional(),
  timeoutMs: z.number().int().min(1000).max(120000).default(30000),
  maxOutputChars: z
    .number()
    .int()
    .min(1024)
    .max(1024 * 1024)
    .default(128 * 1024)
})
export type HeadlessTerminalRequest = z.input<typeof headlessTerminalRequestSchema>
export type ParsedHeadlessTerminalRequest = z.infer<typeof headlessTerminalRequestSchema>

export const headlessTerminalResultSchema = z.object({
  command: z.string(),
  cwd: z.string(),
  shell: z.string(),
  stdout: z.string(),
  stderr: z.string(),
  exitCode: z.number().int().nullable(),
  timedOut: z.boolean(),
  durationMs: z.number().int().nonnegative(),
  truncated: z.boolean()
})
export type HeadlessTerminalResult = z.infer<typeof headlessTerminalResultSchema>

export const terminalSnapshotSchema = z.object({
  session: terminalSessionSchema,
  output: z.string(),
  truncated: z.boolean(),
  lastSequence: z.number().int().nonnegative()
})
export type TerminalSnapshot = z.infer<typeof terminalSnapshotSchema>

export const terminalDataEventSchema = z.object({
  sessionId: z.string().uuid(),
  data: z.string(),
  sequence: z.number().int().positive()
})
export type TerminalDataEvent = z.infer<typeof terminalDataEventSchema>

export const terminalExitEventSchema = z.object({ session: terminalSessionSchema })
export type TerminalExitEvent = z.infer<typeof terminalExitEventSchema>
