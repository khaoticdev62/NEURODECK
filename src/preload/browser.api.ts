export const browserApi = {
  createTab: (url?: string, profileId?: string) => {
    try {
      const { ipcRenderer } = require("electron");
      return ipcRenderer.invoke("browser:create-tab", { url, profileId });
    } catch {
      return Promise.resolve({ id: "mock-tab" });
    }
  },
  closeTab: (tabId: string) => {
    try {
      const { ipcRenderer } = require("electron");
      return ipcRenderer.invoke("browser:close-tab", { tabId });
    } catch {
      return Promise.resolve({ success: true });
    }
  },
  switchTab: (tabId: string) => {
    try {
      const { ipcRenderer } = require("electron");
      return ipcRenderer.invoke("browser:switch-tab", { tabId });
    } catch {
      return Promise.resolve({ success: true });
    }
  },
  navigate: (tabId: string, url: string) => {
    try {
      const { ipcRenderer } = require("electron");
      return ipcRenderer.invoke("browser:navigate", { tabId, url });
    } catch {
      return Promise.resolve({ success: true });
    }
  },
  goBack: (tabId: string) => {
    try {
      const { ipcRenderer } = require("electron");
      return ipcRenderer.invoke("browser:go-back", { tabId });
    } catch {
      return Promise.resolve({ success: true });
    }
  },
  goForward: (tabId: string) => {
    try {
      const { ipcRenderer } = require("electron");
      return ipcRenderer.invoke("browser:go-forward", { tabId });
    } catch {
      return Promise.resolve({ success: true });
    }
  },
  reload: (tabId: string) => {
    try {
      const { ipcRenderer } = require("electron");
      return ipcRenderer.invoke("browser:reload", { tabId });
    } catch {
      return Promise.resolve({ success: true });
    }
  },
  stop: (tabId: string) => {
    try {
      const { ipcRenderer } = require("electron");
      return ipcRenderer.invoke("browser:stop", { tabId });
    } catch {
      return Promise.resolve({ success: true });
    }
  },
  findInPage: (tabId: string, text: string, findNext: boolean = false) => {
    try {
      const { ipcRenderer } = require("electron");
      return ipcRenderer.invoke("browser:find-in-page", { tabId, text, findNext });
    } catch {
      return Promise.resolve({ success: true });
    }
  },
  setZoom: (tabId: string, zoomFactor: number) => {
    try {
      const { ipcRenderer } = require("electron");
      return ipcRenderer.invoke("browser:set-zoom", { tabId, zoomFactor });
    } catch {
      return Promise.resolve({ success: true });
    }
  },
  getTabs: () => {
    try {
      const { ipcRenderer } = require("electron");
      return ipcRenderer.invoke("browser:get-tabs");
    } catch {
      return Promise.resolve([]);
    }
  },
  getActiveTab: () => {
    try {
      const { ipcRenderer } = require("electron");
      return ipcRenderer.invoke("browser:get-active-tab");
    } catch {
      return Promise.resolve(null);
    }
  },
  getProfiles: () => {
    try {
      const { ipcRenderer } = require("electron");
      return ipcRenderer.invoke("browser:get-profiles");
    } catch {
      return Promise.resolve([]);
    }
  },
  setProfile: (tabId: string, profileId: string) => {
    try {
      const { ipcRenderer } = require("electron");
      return ipcRenderer.invoke("browser:set-profile", { tabId, profileId });
    } catch {
      return Promise.resolve({ success: true });
    }
  },
  clearData: (profileId: string, options: any) => {
    try {
      const { ipcRenderer } = require("electron");
      return ipcRenderer.invoke("browser:clear-data", { profileId, options });
    } catch {
      return Promise.resolve({ success: true });
    }
  },
  getHistory: (profileId?: string) => {
    try {
      const { ipcRenderer } = require("electron");
      return ipcRenderer.invoke("browser:get-history", { profileId });
    } catch {
      return Promise.resolve([]);
    }
  },
  getBookmarks: (profileId?: string) => {
    try {
      const { ipcRenderer } = require("electron");
      return ipcRenderer.invoke("browser:get-bookmarks", { profileId });
    } catch {
      return Promise.resolve([]);
    }
  },
  addBookmark: (url: string, title: string, profileId: string) => {
    try {
      const { ipcRenderer } = require("electron");
      return ipcRenderer.invoke("browser:add-bookmark", { url, title, profileId });
    } catch {
      return Promise.resolve({ success: true });
    }
  },
  getDownloads: () => {
    try {
      const { ipcRenderer } = require("electron");
      return ipcRenderer.invoke("browser:get-downloads");
    } catch {
      return Promise.resolve([]);
    }
  },
  cancelDownload: (id: string) => {
    try {
      const { ipcRenderer } = require("electron");
      return ipcRenderer.invoke("browser:cancel-download", { id });
    } catch {
      return Promise.resolve({ success: true });
    }
  },
  openDownload: (id: string) => {
    try {
      const { ipcRenderer } = require("electron");
      return ipcRenderer.invoke("browser:open-download", { id });
    } catch {
      return Promise.resolve({ success: true });
    }
  },
  showDownload: (id: string) => {
    try {
      const { ipcRenderer } = require("electron");
      return ipcRenderer.invoke("browser:show-download", { id });
    } catch {
      return Promise.resolve({ success: true });
    }
  },
  getPermissions: () => {
    try {
      const { ipcRenderer } = require("electron");
      return ipcRenderer.invoke("browser:get-permissions");
    } catch {
      return Promise.resolve([]);
    }
  },
  setPermission: (payload: any) => {
    try {
      const { ipcRenderer } = require("electron");
      return ipcRenderer.invoke("browser:set-permission", payload);
    } catch {
      return Promise.resolve({ success: true });
    }
  },
  openDevTools: (tabId: string) => {
    try {
      const { ipcRenderer } = require("electron");
      return ipcRenderer.invoke("browser:open-devtools", { tabId });
    } catch {
      return Promise.resolve({ success: true });
    }
  },
  getDiagnostics: () => {
    try {
      const { ipcRenderer } = require("electron");
      return ipcRenderer.invoke("browser:get-diagnostics");
    } catch {
      return Promise.resolve(null);
    }
  },
  subscribeToEvents: (callback: (data: any) => void) => {
    try {
      const { ipcRenderer } = require("electron");
      const handler = (_event: any, data: any) => callback(data);
      ipcRenderer.on("browser-event", handler);
      return () => ipcRenderer.removeListener("browser-event", handler);
    } catch {
      return () => {};
    }
  },
};
export default browserApi;
