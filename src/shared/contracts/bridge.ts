import type { FileEntry, ListFilesRequest, ReadFileRequest, ReadFileResult } from './file'
import type { NdxResult } from './error'
import type { CreateWorkspaceRequest, Workspace } from './workspace'

/**
 * The shape of the real preload bridge (`window.ndx`). Defined here, in
 * shared, rather than in `src/preload/index.ts` — both the preload script
 * and the renderer need this type, and a renderer file importing a type
 * from `src/preload/*.ts` trips TypeScript's composite-project file-listing
 * rule (`tsconfig.web.json` doesn't include preload `.ts` sources, only
 * `.d.ts`). Importing it from `shared` instead avoids that boundary
 * violation entirely.
 */
export interface NdxBridge {
  workspaces: {
    list: () => Promise<NdxResult<Workspace[]>>
    create: (request: CreateWorkspaceRequest) => Promise<NdxResult<Workspace>>
    remove: (id: string) => Promise<NdxResult<null>>
    pickFolder: () => Promise<NdxResult<string | null>>
  }
  files: {
    list: (request: ListFilesRequest) => Promise<NdxResult<FileEntry[]>>
    read: (request: ReadFileRequest) => Promise<NdxResult<ReadFileResult>>
  }
}
