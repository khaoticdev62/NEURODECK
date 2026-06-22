/** Single source of truth for IPC channel names — main, preload, and renderer all import this rather than hand-typing strings. */
export const IPC_CHANNELS = {
  workspaceList: 'workspace.list',
  workspaceCreate: 'workspace.create',
  workspaceRemove: 'workspace.remove',
  workspacePickFolder: 'workspace.pickFolder',
  fileList: 'file.list',
  fileRead: 'file.read'
} as const
