import { useCallback, useState } from 'react'
import { readFile } from '../../services/ipc/fileClient'

export interface OpenFile {
  path: string
  content: string
  truncated: boolean
  error: string | null
}

export interface UseOpenFilesResult {
  openFiles: OpenFile[]
  activePath: string | null
  openFile: (path: string) => Promise<void>
  closeFile: (path: string) => void
  setActivePath: (path: string) => void
}

/** Tab state for Build Studio. Read-only: there is no save path yet — see ledger Epic 7 scope decision. */
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
          ? { path, content: result.data.content, truncated: result.data.truncated, error: null }
          : { path, content: '', truncated: false, error: result.error.userMessage }
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

  return { openFiles, activePath, openFile, closeFile, setActivePath }
}
