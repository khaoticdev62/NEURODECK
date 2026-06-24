import { ipcMain } from 'electron'
import {
  curriculumIdRequestSchema,
  IPC_CHANNELS,
  updateProgressRequestSchema,
  createUserCurriculumRequestSchema,
  updateUserCurriculumRequestSchema
} from '@shared/contracts'
import type { NdxResult } from '@shared/contracts'
import type { LearningService } from '../../core/learning/LearningService'

export function registerLearningHandlers(learningService: LearningService): void {
  ipcMain.handle(IPC_CHANNELS.learningListCurricula, async (): Promise<NdxResult<unknown>> => {
    try {
      const curricula = await learningService.listCurricula()
      return { ok: true, data: curricula }
    } catch (error) {
      return learningErrorResult(error)
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.learningGetCurriculum,
    async (_event, raw: unknown): Promise<NdxResult<unknown>> => {
      const parsed = curriculumIdRequestSchema.safeParse(raw)
      if (!parsed.success) {
        return validationError(parsed.error.message)
      }
      try {
        const curriculum = await learningService.getCurriculum(parsed.data)
        if (!curriculum) {
          return {
            ok: false,
            error: {
              category: 'learning',
              code: 'curriculum-not-found',
              message: `Curriculum ${parsed.data.curriculumId} not found.`,
              userMessage: 'That curriculum could not be found.',
              retryable: false,
              correlationId: `lrn-${Date.now()}`
            }
          }
        }
        return { ok: true, data: curriculum }
      } catch (error) {
        return learningErrorResult(error)
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.learningCreateUserCurriculum,
    async (_event, raw: unknown): Promise<NdxResult<unknown>> => {
      const parsed = createUserCurriculumRequestSchema.safeParse(raw)
      if (!parsed.success) {
        return validationError(parsed.error.message)
      }
      try {
        const curriculum = await learningService.createUserCurriculum(parsed.data)
        return { ok: true, data: curriculum }
      } catch (error) {
        return learningErrorResult(error)
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.learningUpdateUserCurriculum,
    async (_event, raw: unknown): Promise<NdxResult<unknown>> => {
      const parsed = updateUserCurriculumRequestSchema.safeParse(raw)
      if (!parsed.success) {
        return validationError(parsed.error.message)
      }
      try {
        const curriculum = await learningService.updateUserCurriculum(parsed.data)
        if (!curriculum) {
          return {
            ok: false,
            error: {
              category: 'learning',
              code: 'curriculum-not-found',
              message: `Curriculum ${parsed.data.id} not found.`,
              userMessage: 'That curriculum could not be found.',
              retryable: false,
              correlationId: `lrn-${Date.now()}`
            }
          }
        }
        return { ok: true, data: curriculum }
      } catch (error) {
        return learningErrorResult(error)
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.learningDeleteUserCurriculum,
    async (_event, raw: unknown): Promise<NdxResult<unknown>> => {
      const parsed = curriculumIdRequestSchema.safeParse(raw)
      if (!parsed.success) {
        return validationError(parsed.error.message)
      }
      try {
        await learningService.deleteUserCurriculum(parsed.data)
        return { ok: true, data: null }
      } catch (error) {
        return learningErrorResult(error)
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.learningGetProgress, async (): Promise<NdxResult<unknown>> => {
    try {
      const progress = await learningService.getProgress()
      return { ok: true, data: progress }
    } catch (error) {
      return learningErrorResult(error)
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.learningUpdateProgress,
    async (_event, raw: unknown): Promise<NdxResult<unknown>> => {
      const parsed = updateProgressRequestSchema.safeParse(raw)
      if (!parsed.success) {
        return validationError(parsed.error.message)
      }
      try {
        const progress = await learningService.updateProgress(parsed.data)
        return { ok: true, data: progress }
      } catch (error) {
        return learningErrorResult(error)
      }
    }
  )
}

function validationError(message: string): NdxResult<never> {
  return {
    ok: false,
    error: {
      category: 'learning',
      code: 'invalid-request',
      message,
      userMessage: 'The request was not valid.',
      retryable: false,
      correlationId: `lrn-${Date.now()}`
    }
  }
}

function learningErrorResult(error: unknown): NdxResult<never> {
  return {
    ok: false,
    error: {
      category: 'learning',
      code: 'learning-operation-failed',
      message: error instanceof Error ? error.message : 'Unknown learning error',
      userMessage: 'Something went wrong with the learning service.',
      retryable: true,
      correlationId: `lrn-${Date.now()}`
    }
  }
}
