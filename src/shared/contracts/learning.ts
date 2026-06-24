import { z } from 'zod'

export const learningAreaSchema = z.enum([
  'it-fundamentals',
  'soc-security',
  'linux',
  'networking',
  'development',
  'git',
  'ai-tooling',
  'steam-deck-system-skills',
  'other'
])
export type LearningArea = z.infer<typeof learningAreaSchema>

export const lessonTypeSchema = z.enum(['read', 'lab'])
export type LessonType = z.infer<typeof lessonTypeSchema>

export const objectiveSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1)
})
export type Objective = z.infer<typeof objectiveSchema>

export const hintSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1)
})
export type Hint = z.infer<typeof hintSchema>

export const lessonSchema = z.object({
  id: z.string().min(1),
  type: lessonTypeSchema,
  title: z.string().min(1),
  instructions: z.string().min(1),
  estimatedMinutes: z.number().int().nonnegative().default(0),
  objectives: z.array(objectiveSchema).default([]),
  hints: z.array(hintSchema).default([]),
  /** Optional shell command to write into the terminal when a lab starts. */
  setupCommand: z.string().max(4096).optional(),
  /** Optional working directory relative to the active workspace root. */
  cwd: z.string().max(1024).optional(),
  requiredTools: z.array(z.string()).default([])
})
export type Lesson = z.infer<typeof lessonSchema>

export const moduleSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  lessons: z.array(lessonSchema).min(1)
})
export type Module = z.infer<typeof moduleSchema>

export const curriculumSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  area: learningAreaSchema,
  description: z.string().min(1),
  modules: z.array(moduleSchema).min(1),
  requiredTools: z.array(z.string()).default([]),
  /** All bundled/user curricula are stored locally, so offline is always true. */
  offline: z.literal(true).default(true),
  /** Whether this curriculum ships with the app (read-only). */
  bundled: z.boolean().default(false),
  createdAt: z
    .number()
    .int()
    .nonnegative()
    .default(() => Date.now())
})
export type Curriculum = z.infer<typeof curriculumSchema>

export const lessonProgressSchema = z.enum(['not_started', 'in_progress', 'completed'])
export type LessonProgress = z.infer<typeof lessonProgressSchema>

export const curriculumProgressSchema = z.record(
  z.string(),
  z.record(z.string(), z.record(z.string(), lessonProgressSchema))
)
export type CurriculumProgress = z.infer<typeof curriculumProgressSchema>

export const curriculumIdRequestSchema = z.object({
  curriculumId: z.string().min(1)
})
export type CurriculumIdRequest = z.infer<typeof curriculumIdRequestSchema>

export const lessonIdRequestSchema = curriculumIdRequestSchema.extend({
  moduleId: z.string().min(1),
  lessonId: z.string().min(1)
})
export type LessonIdRequest = z.infer<typeof lessonIdRequestSchema>

export const updateProgressRequestSchema = lessonIdRequestSchema.extend({
  status: lessonProgressSchema
})
export type UpdateProgressRequest = z.infer<typeof updateProgressRequestSchema>

export const createUserCurriculumRequestSchema = curriculumSchema.omit({
  id: true,
  bundled: true,
  createdAt: true
})
export type CreateUserCurriculumRequest = z.infer<typeof createUserCurriculumRequestSchema>

export const updateUserCurriculumRequestSchema = curriculumSchema.partial().extend({
  id: z.string().min(1)
})
export type UpdateUserCurriculumRequest = z.infer<typeof updateUserCurriculumRequestSchema>

export const learningCatalogSchema = z.object({
  curricula: z.array(curriculumSchema)
})
export type LearningCatalog = z.infer<typeof learningCatalogSchema>

export const learningStateSchema = z.object({
  curricula: z.array(curriculumSchema),
  progress: curriculumProgressSchema
})
export type LearningState = z.infer<typeof learningStateSchema>
