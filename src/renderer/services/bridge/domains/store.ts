import { bridgeInvoke } from "../http";

export const store = {
  async get<T>(key: string): Promise<T | null> {
    const neurodeck = (window as any).neurodeck;
    if (neurodeck?.settings) {
      const res = await neurodeck.settings.get(key);
      if (res.ok) return res.data as T;
    }
    try {
      return await bridgeInvoke<T>("get_store", { key });
    } catch (_) {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    }
  },
  async set(key: string, value: unknown) {
    const neurodeck = (window as any).neurodeck;
    if (neurodeck?.settings) {
      const res = await neurodeck.settings.set(key, value);
      if (res.ok) return { ok: true, updatedAt: new Date().toISOString() };
    }
    try {
      await bridgeInvoke("set_store", { key, value });
    } catch (_) {
      localStorage.setItem(key, JSON.stringify(value));
    }
    return { ok: true, updatedAt: new Date().toISOString() };
  },
  async reset(key: string) {
    const neurodeck = (window as any).neurodeck;
    if (neurodeck?.settings) {
      const res = await neurodeck.settings.set(key, null);
      if (res.ok) return { ok: true, updatedAt: new Date().toISOString() };
    }
    try {
      await bridgeInvoke("reset_store", { key });
    } catch (_) {
      localStorage.removeItem(key);
    }
    return { ok: true, updatedAt: new Date().toISOString() };
  },
  async setConfig(key: string, value: string) {
    return bridgeInvoke<{ status: string; key: string; value: string }>("set_config", {
      key,
      value,
    });
  },
  async saveGeminiApiKey(key: string) {
    return bridgeInvoke<{ status: string }>("save_gemini_api_key", { key });
  },
  async saveOpenAiCompatApiKey(key: string) {
    return bridgeInvoke<{ status: string }>("save_openai_compat_api_key", { key });
  },
};
