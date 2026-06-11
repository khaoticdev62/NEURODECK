/**
 * TypeScript declarations for the Electron preload surface.
 *
 * Matches the `contextBridge.exposeInMainWorld('electronAPI', ...)` call
 * in electron/preload.js. Update both files together.
 */

interface SafeStorageEncryptResult {
  ok: true;
  ciphertext: string;
}

interface SafeStorageDecryptResult {
  ok: true;
  plaintext: string;
}

interface SafeStorageError {
  ok: false;
  error: string;
}

interface SaveDialogResult {
  canceled: boolean;
  filePath?: string;
}

interface OpenDialogResult {
  canceled: boolean;
  filePaths?: string[];
}

interface ElectronVersions {
  app: string;
  electron: string;
  chrome: string;
  node: string;
}

interface ElectronAPI {
  /** Current platform string (e.g. 'win32', 'linux', 'darwin'). */
  readonly platform: NodeJS.Platform;
  /** Runtime version strings. */
  readonly versions: ElectronVersions;

  /** Returns the localhost port the Rust bridge sidecar is listening on. */
  getBridgePort(): Promise<number>;

  /** Opens a URL in the OS default browser. Only http/https URLs are allowed. */
  openExternal(url: string): Promise<void>;

  /** Shows the OS save-file dialog. */
  showSaveDialog(options?: Electron.SaveDialogOptions): Promise<SaveDialogResult>;

  /** Shows the OS open-file dialog. */
  showOpenDialog(options?: Electron.OpenDialogOptions): Promise<OpenDialogResult>;

  /** Returns true if OS-level encryption is available (keychain / DPAPI / SecretService). */
  isSafeStorageAvailable(): Promise<boolean>;

  /** Encrypts a plaintext string using OS safe storage. */
  safeStorageEncrypt(plain: string): Promise<SafeStorageEncryptResult | SafeStorageError>;

  /** Decrypts a ciphertext string produced by safeStorageEncrypt. */
  safeStorageDecrypt(encrypted: string): Promise<SafeStorageDecryptResult | SafeStorageError>;

  /** Toggles kiosk / fullscreen mode (Steam Deck Game Mode). */
  setKiosk(enabled: boolean): Promise<boolean>;

  /** Returns whether the app is currently in kiosk mode. */
  getIsKiosk(): Promise<boolean>;

  /** Returns the current notification permission status. */
  requestNotificationPermission(): Promise<'granted' | 'denied'>;

  // Browser (WebContentsView)
  browserOpen(url: string): Promise<{ success: boolean }>;
  browserNavigate(url: string): Promise<{ success: boolean }>;
  browserBack(): Promise<{ success: boolean }>;
  browserForward(): Promise<{ success: boolean }>;
  browserReload(): Promise<{ success: boolean }>;
  browserGetUrl(): Promise<{ url: string }>;
  browserHide(): Promise<{ success: boolean }>;
  browserShow(): Promise<{ success: boolean }>;
  browserSetBounds(bounds: { x: number; y: number; width: number; height: number }): Promise<{ success: boolean }>;
  browserGetContent(): Promise<{ content: string }>;
  browserSaveToMemory(): Promise<{ success: boolean; note?: string }>;
  browserZoomIn(): Promise<{ zoomLevel: number }>;
  browserZoomOut(): Promise<{ zoomLevel: number }>;
  browserZoomReset(): Promise<{ zoomLevel: number }>;
  browserFind(text: string): Promise<{ success: boolean }>;
  browserStopFind(): Promise<{ success: boolean }>;

  // Bookmarks
  browserBookmarkAdd(title: string, url: string): Promise<{ success: boolean; bookmarks: Array<{ title: string; url: string; createdAt: number }> }>;
  browserBookmarkRemove(url: string): Promise<{ success: boolean; bookmarks: Array<{ title: string; url: string; createdAt: number }> }>;
  browserBookmarkList(): Promise<{ bookmarks: Array<{ title: string; url: string; createdAt: number }> }>;

  // History
  browserHistoryList(): Promise<{ history: Array<{ url: string; title: string; timestamp: number }> }>;
  browserHistoryClear(): Promise<{ success: boolean }>;

  // Reader mode
  browserReaderMode(): Promise<{ success: boolean; title: string; text: string; url: string }>;

  // Ad blocker
  browserAdblockToggle(): Promise<{ enabled: boolean }>;
  browserAdblockStatus(): Promise<{ enabled: boolean }>;

  onBrowserEvent(callback: (data: { event: string; payload: Record<string, unknown> }) => void): () => void;
}

declare global {
  interface Window {
    /** Electron preload API — only available in the Electron renderer. */
    electronAPI?: ElectronAPI;
    /** The Rust sidecar bridge port — injected synchronously by preload. */
    NEURODECK_PORT?: string;
  }
}

export type { ElectronAPI, ElectronVersions, SafeStorageEncryptResult, SafeStorageDecryptResult, SafeStorageError };
