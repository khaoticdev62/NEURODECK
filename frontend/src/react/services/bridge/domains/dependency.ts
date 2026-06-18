export interface DependencyStatus {
  ssh: boolean;
  ollama: boolean;
  tts: boolean;
  openvpn: boolean;
  wireguard: boolean;
}

export interface DependencyProgress {
  id: string;
  state: "downloading" | "installing" | "verifying" | "completed" | "failed";
  percent?: number;
  downloadedBytes?: number;
  totalBytes?: number;
  speed?: number;
  details?: string;
  error?: string;
}

export const dependency = {
  async getStatus(): Promise<DependencyStatus> {
    if (window.electronAPI?.dependencyGetStatus) {
      return window.electronAPI.dependencyGetStatus();
    }
    return { ssh: false, ollama: false, tts: false, openvpn: false, wireguard: false };
  },
  async install(id: string): Promise<{ success: boolean }> {
    if ((window as any).neurodeck?.dependency) {
      const res = await (window as any).neurodeck.dependency.install(id);
      return res?.payload || { success: false };
    }
    return { success: false };
  },
  async cancel(id: string): Promise<boolean> {
    if ((window as any).neurodeck?.dependency) {
      const res = await (window as any).neurodeck.dependency.cancel(id);
      return res?.payload || false;
    }
    return false;
  },
  onProgress(callback: (data: DependencyProgress) => void): () => void {
    if ((window as any).neurodeck?.dependency) {
      return (window as any).neurodeck.dependency.onProgress((data: any) => {
        callback(data);
      });
    }
    return () => {};
  },
};
