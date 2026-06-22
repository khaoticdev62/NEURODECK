import { useCallback, useState } from 'react'
import { readFile, writeFile } from '../../services/ipc/fileClient'

export interface OpenFile {
  path: string
  content: string
  savedContent: string
  truncated: boolean
  error: string | null
  saveError: string | null
  saving: boolean
}

export interface UseOpenFilesResult {
  openFiles: OpenFile[]
  activePath: string | null
  openFile: (path: string) => Promise<void>
  closeFile: (path: string) => void
  setActivePath: (path: string) => void
  updateContent: (path: string, content: string) => void
  saveFile: (path: string, description: string) => Promise<boolean>
}

/**
 * Tab state for Build Studio. Real save, backed by the Epic 11 Recovery
 * Service — every save records a recovery checkpoint of the prior content
 * before overwriting it (see `registerFileHandlers.ts`'s `fileWrite`
 * handler), so this is no longer the "no save path yet" gap Epic 7 left
 * open.
 */
export function useOpenFiles(workspaceId: string): UseOpenFilesResult {
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([])
  const [activePath, setActivePath] = useState<string | null>(null)

  const openFile = useCallback(
    async (path: string) => {
      setActivePath(path)
      if (openFiles.some((file) => file.path === path)) return

      const result = await readFile({ workspaceId, relativePath: path })
      setOpenFiles((current) => {
        if (current.some((file) => file.path === path)) return current
        const file: OpenFile = result.ok
          ? {
              path,
              content: result.data.content,
              savedContent: result.data.content,
              truncated: result.data.truncated,
              error: null,
              saveError: null,
              saving: false
            }
          : {
              path,
              content: '',
              savedContent: '',
              truncated: false,
              error: result.error.userMessage,
              saveError: null,
              saving: false
            }
        return [...current, file]
      })
    },
    [workspaceId, openFiles]
  )

  const closeFile = useCallback(
    (path: string) => {
      setOpenFiles((current) => current.filter((file) => file.path !== path))
      setActivePath((current) => {
        if (current !== path) return current
        const remaining = openFiles.filter((file) => file.path !== path)
        return remaining[remaining.length - 1]?.path ?? null
      })
    },
    [openFiles]
  )

  const updateContent = useCallback((path: string, content: string) => {
    setOpenFiles((current) =>
      current.map((file) => (file.path === path ? { ...file, content } : file))
    )
  }, [])

  const saveFile = useCallback(
    async (path: string, description: string) => {
      const file = openFiles.find((candidate) => candidate.path === path)
      if (!file) return false

      setOpenFiles((current) => current.map((f) => (f.path === path ? { ...f, saving: true } : f)))
      const result = await writeFile({
        workspaceId,
        relativePath: path,
        content: file.content,
        description
      })
      setOpenFiles((current) =>
        current.map((f) =>
          f.path === path
            ? result.ok
              ? { ...f, saving: false, saveError: null, savedContent: f.content }
              : { ...f, saving: false, saveError: result.error.userMessage }
            : f
        )
      )
      return result.ok
    },
    [workspaceId, openFiles]
  )

  return { openFiles, activePath, openFile, closeFile, setActivePath, updateContent, saveFile }
}
