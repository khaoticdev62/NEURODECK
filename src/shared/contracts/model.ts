import { z } from 'zod'

export const modelProviderKindSchema = z.enum([
  'local-openai-compatible',
  'cloud-openai-compatible',
  'ollama'
])
export type ModelProviderKind = z.infer<typeof modelProviderKindSchema>

/** Never includes the API key — that never leaves the main process. */
export const modelProviderSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: modelProviderKindSchema,
  baseUrl: z.string(),
  hasApiKey: z.boolean(),
  enabled: z.boolean(),
  createdAt: z.number()
})
export type ModelProvider = z.infer<typeof modelProviderSchema>

export const modelInfoSchema = z.object({
  id: z.string(),
  ownedBy: z.string().optional()
})
export type ModelInfo = z.infer<typeof modelInfoSchema>

export const connectionTestResultSchema = z.object({
  ok: z.boolean(),
  message: z.string(),
  models: z.array(modelInfoSchema)
})
export type ConnectionTestResult = z.infer<typeof connectionTestResultSchema>

export const addModelProviderRequestSchema = z.object({
  name: z.string().min(1),
  kind: modelProviderKindSchema,
  baseUrl: z.string().min(1),
  apiKey: z.string().optional()
})
export type AddModelProviderRequest = z.infer<typeof addModelProviderRequestSchema>

export const modelProviderIdRequestSchema = z.object({
  providerId: z.string().min(1)
})
export type ModelProviderIdRequest = z.infer<typeof modelProviderIdRequestSchema>

export const modelMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().min(1)
})
export type ModelMessage = z.infer<typeof modelMessageSchema>

export const routingProfileIdSchema = z.enum([
  'balanced',
  'local-first',
  'offline',
  'battery-saver',
  'maximum-quality',
  'fast-coding',
  'private-workspace',
  'low-cost'
])
export type RoutingProfileId = z.infer<typeof routingProfileIdSchema>

export const modelCompletionRequestSchema = z.object({
  messages: z.array(modelMessageSchema).min(1).max(64),
  profileId: routingProfileIdSchema.default('balanced'),
  providerId: z.string().min(1).optional(),
  modelId: z.string().min(1).optional(),
  workspacePrivate: z.boolean().default(false),
  temperature: z.number().min(0).max(2).default(0.2),
  maxTokens: z.number().int().min(1).max(32768).default(2048)
})
export type ModelCompletionRequest = z.infer<typeof modelCompletionRequestSchema>

export const modelUsageSchema = z.object({
  promptTokens: z.number().int().nonnegative().optional(),
  completionTokens: z.number().int().nonnegative().optional(),
  totalTokens: z.number().int().nonnegative().optional()
})
export type ModelUsage = z.infer<typeof modelUsageSchema>

export const modelCompletionResultSchema = z.object({
  providerId: z.string(),
  providerName: z.string(),
  modelId: z.string(),
  content: z.string(),
  local: z.boolean(),
  profileId: routingProfileIdSchema,
  usage: modelUsageSchema,
  durationMs: z.number().nonnegative()
})
export type ModelCompletionResult = z.infer<typeof modelCompletionResultSchema>

export const modelRouteDecisionSchema = z.object({
  providerId: z.string(),
  providerName: z.string(),
  modelId: z.string(),
  local: z.boolean(),
  profileId: routingProfileIdSchema,
  reasons: z.array(z.string()),
  measured: z.object({
    memoryUsedPercent: z.number().optional(),
    batteryPercent: z.number().optional(),
    temperatureCelsius: z.number().optional()
  })
})
export type ModelRouteDecision = z.infer<typeof modelRouteDecisionSchema>

export const modelRouteRequestSchema = modelCompletionRequestSchema.omit({ messages: true })
export type ModelRouteRequest = z.infer<typeof modelRouteRequestSchema>

export const setModelProviderEnabledRequestSchema = modelProviderIdRequestSchema.extend({
  enabled: z.boolean()
})
export type SetModelProviderEnabledRequest = z.infer<typeof setModelProviderEnabledRequestSchema>

export const localModelRequestSchema = modelProviderIdRequestSchema.extend({
  modelId: z.string().min(1)
})
export type LocalModelRequest = z.infer<typeof localModelRequestSchema>

export const localModelStatusSchema = z.object({
  providerId: z.string(),
  supported: z.boolean(),
  runningModelIds: z.array(z.string()),
  reason: z.string().optional()
})
export type LocalModelStatus = z.infer<typeof localModelStatusSchema>

export const modelBenchmarkResultSchema = z.object({
  modelId: z.string(),
  durationMs: z.number().nonnegative(),
  outputTokens: z.number().int().nonnegative().optional(),
  tokensPerSecond: z.number().nonnegative().optional()
})
export type ModelBenchmarkResult = z.infer<typeof modelBenchmarkResultSchema>
