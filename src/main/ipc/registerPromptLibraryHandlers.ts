import { ipcMain } from 'electron'
import {
  IPC_CHANNELS,
  ndxError,
  personaIdRequestSchema,
  promptTemplateIdRequestSchema,
  upsertPersonaRequestSchema,
  upsertPromptTemplateRequestSchema,
  type NdxResult,
  type Persona,
  type PromptTemplate
} from '@shared/contracts'
import type { PersonaStore } from '../../core/promptLibrary/PersonaStore'
import type { PromptTemplateStore } from '../../core/promptLibrary/PromptTemplateStore'

/** Real Epic X4 Prompt Template + Persona library IPC (supplemental spec §14.1/§14.2). */
export function registerPromptLibraryHandlers(
  promptStore: PromptTemplateStore,
  personaStore: PersonaStore
): void {
  ipcMain.handle(
    IPC_CHANNELS.promptTemplateList,
    async (): Promise<NdxResult<PromptTemplate[]>> => {
      return { ok: true, data: await promptStore.list() }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.promptTemplateUpsert,
    async (_event, payload: unknown): Promise<NdxResult<PromptTemplate>> => {
      const parsed = upsertPromptTemplateRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That template is invalid.')
        }
      }
      return { ok: true, data: await promptStore.upsert(parsed.data) }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.promptTemplateRemove,
    async (_event, payload: unknown): Promise<NdxResult<null>> => {
      const parsed = promptTemplateIdRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That template id is invalid.')
        }
      }
      await promptStore.remove(parsed.data.id)
      return { ok: true, data: null }
    }
  )

  ipcMain.handle(IPC_CHANNELS.personaList, async (): Promise<NdxResult<Persona[]>> => {
    return { ok: true, data: await personaStore.list() }
  })

  ipcMain.handle(
    IPC_CHANNELS.personaUpsert,
    async (_event, payload: unknown): Promise<NdxResult<Persona>> => {
      const parsed = upsertPersonaRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That persona is invalid.')
        }
      }
      return { ok: true, data: await personaStore.upsert(parsed.data) }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.personaRemove,
    async (_event, payload: unknown): Promise<NdxResult<null>> => {
      const parsed = personaIdRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That persona id is invalid.')
        }
      }
      await personaStore.remove(parsed.data.id)
      return { ok: true, data: null }
    }
  )
}
