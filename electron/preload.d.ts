export interface ElectronAPI {
  /** The OS platform identifier (e.g. 'win32', 'linux', 'darwin'). */
  platform: string;
  /** Version strings injected by the main process. */
  versions: {
    app: string;
    electron: string;
    chrome: string;
    node: string;
  };
  /** Returns the bridge port that the Rust sidecar is listening on. */
  getBridgePort(): Promise<number>;
  /**
   * Opens a URL in the OS default browser.
   * Only http/https URLs are allowed — others are silently dropped.
   */
  openExternal(url: string): Promise<void>;
  /** Shows the OS save-file dialog. Returns { canceled, filePath }. */
  showSaveDialog(options: object): Promise<{ canceled: boolean; filePath?: string }>;
  /** Shows the OS open-file dialog. Returns { canceled, filePaths }. */
  showOpenDialog(options: object): Promise<{ canceled: boolean; filePaths?: string[] }>;
  /**
   * Encrypts a string using the OS keychain (Electron safeStorage).
   * Returns base64-encoded ciphertext, or null on failure.
   */
  safeStorageEncrypt(plain: string): Promise<string | null>;
  /**
   * Decrypts a base64-encoded ciphertext encrypted with safeStorageEncrypt.
   * Returns the plaintext string, or null on failure.
   */
  safeStorageDecrypt(encrypted: string): Promise<string | null>;
  /** Returns true if the OS keychain encryption is available on this machine. */
  isSafeStorageAvailable(): Promise<boolean>;
  /** Toggles kiosk/fullscreen mode (used for Steam Deck Game Mode). */
  setKiosk(enabled: boolean): Promise<boolean>;
  /** Returns true if the window is currently in kiosk mode. */
  getIsKiosk(): Promise<boolean>;
  /** Requests OS notification permission (renderer-facing wrapper). */
  requestNotificationPermission(): Promise<string>;
  vpn: {
    listProfiles(): Promise<unknown[]>;
    getProfile(profileId: string): Promise<unknown | null>;
    createProfile(payload: unknown): Promise<unknown | null>;
    updateProfile(payload: unknown): Promise<unknown | null>;
    deleteProfile(profileId: string): Promise<unknown | null>;
    importConfig(text: string, kind?: string): Promise<unknown | null>;
    validateConfig(text: string, kind?: string): Promise<unknown | null>;
    listTemplates(): Promise<unknown[]>;
    connect(profileId: string, browserProfileId?: string): Promise<unknown | null>;
    disconnect(profileId: string): Promise<unknown | null>;
    verify(profileId: string): Promise<unknown | null>;
    repair(profileId: string): Promise<unknown | null>;
    getStatus(profileId?: string): Promise<unknown | null>;
    getEvidence(profileId?: string): Promise<unknown[]>;
    getRecoveryEvents(): Promise<unknown[]>;
    setKillSwitch(profileId: string, enabled: boolean): Promise<unknown | null>;
    applyBrowserProxy(profileId: string, browserProfileId?: string): Promise<unknown | null>;
    clearBrowserProxy(profileId: string, browserProfileId?: string): Promise<unknown | null>;
    getProviderMatrix(): Promise<unknown[]>;
    exportRedactedProfile(profileId: string): Promise<unknown | null>;
  };
}

declare global {
  interface Window {
    /** Electron-native APIs exposed via contextBridge. Only available inside Electron. */
    electronAPI: ElectronAPI;
    /** The port the Rust sidecar bridge is listening on (e.g. '9477'). */
    NEURODECK_PORT: string;
  }
}
