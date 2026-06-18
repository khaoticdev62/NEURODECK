import type {
  ExportSessionPayload,
  SavedSessionPayload,
  SaveSessionResponse,
  SessionExportResponse,
} from "../../../types/neurodeck";
import { bridgeInvoke } from "../http";

export const sessions = {
  async exportMarkdown(payload: ExportSessionPayload): Promise<SessionExportResponse> {
    try {
      const file = await bridgeInvoke<string>("export_session_markdown", { payload });
      return { ok: true, file };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },
  async save(payload: SavedSessionPayload): Promise<SaveSessionResponse> {
    const neurodeck = (window as any).neurodeck;
    if (neurodeck?.sessions) {
      const res = await neurodeck.sessions.save(payload);
      if (res.ok) return { ok: true, file: res.data };
      return { ok: false, error: res.error?.message || "Failed to save session" };
    }
    try {
      const file = await bridgeInvoke<string>("save_session", { payload });
      return { ok: true, file };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },
  async list(): Promise<string[]> {
    const neurodeck = (window as any).neurodeck;
    if (neurodeck?.sessions) {
      const res = await neurodeck.sessions.list();
      if (res.ok) return res.data || [];
      throw new Error(res.error?.message || "Failed to list sessions");
    }
    return bridgeInvoke<string[]>("list_sessions");
  },
  async listMeta(): Promise<any[]> {
    return bridgeInvoke<any[]>("list_sessions_meta");
  },
  async delete(id: string) {
    const neurodeck = (window as any).neurodeck;
    if (neurodeck?.sessions) {
      const res = await neurodeck.sessions.delete(id);
      if (res.ok) return res.data;
      throw new Error(res.error?.message || "Failed to delete session");
    }
    return bridgeInvoke<{ status: string }>("delete_session", { id });
  },
  async rename(id: string, name: string) {
    return bridgeInvoke<void>("rename_session", { id, name });
  },
  async loadLatest() {
    const neurodeck = (window as any).neurodeck;
    if (neurodeck?.sessions) {
      const res = await neurodeck.sessions.create();
      if (res.ok) return res.data;
      throw new Error(res.error?.message || "Failed to load latest session");
    }
    return bridgeInvoke<{ session_id: string; messages: string[] }>("load_latest_session");
  },
  async loadById(id: string) {
    const neurodeck = (window as any).neurodeck;
    if (neurodeck?.sessions) {
      const res = await neurodeck.sessions.load(id);
      if (res.ok) return res.data;
      throw new Error(res.error?.message || "Failed to load session");
    }
    return bridgeInvoke<{ session_id: string; messages: string[] }>("load_session_by_id", { id });
  },
};
