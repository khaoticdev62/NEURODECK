import { bridgeInvoke } from "../http";

export interface TorrentItem {
  id: string;
  name: string;
  source_kind: string;
  source_display: string;
  source_value: string;
  status: string;
  progress_pct: number;
  pieces_done: number;
  pieces_total: number;
  peers: number;
  trackers: number;
  paused: boolean;
  completed: boolean;
  metadata_known: boolean;
  download_root: string;
  save_path: string | null;
  added_at_utc: string;
  info_hash: string;
  download_rate_bps: number;
  upload_rate_bps: number;
  downloaded_bytes?: number;
  uploaded_bytes?: number;
  bytes_remaining?: number;
  eta_seconds?: number | null;
  ratio?: number | null;
}

export interface TorrentClientStatus {
  download_root: string;
  torrent_count: number;
  torrents: TorrentItem[];
}

export const torrent = {
  async list(): Promise<TorrentItem[]> {
    return bridgeInvoke<TorrentItem[]>("torrent_list");
  },
  async add(magnetOrPath: string) {
    return bridgeInvoke<{ success: boolean; id?: string }>("torrent_add", { source: magnetOrPath });
  },
  async pause(id: string) {
    return bridgeInvoke<{ success: boolean }>("torrent_pause", { id });
  },
  async resume(id: string) {
    return bridgeInvoke<{ success: boolean }>("torrent_resume", { id });
  },
  async remove(id: string, deleteData?: boolean) {
    return bridgeInvoke<{ success: boolean }>("torrent_remove", {
      id,
      delete_data: deleteData ?? false,
    });
  },
  async pauseAll() {
    return bridgeInvoke<{ success: boolean }>("torrent_pause_all");
  },
  async resumeAll() {
    return bridgeInvoke<{ success: boolean }>("torrent_resume_all");
  },
  async getDownloadRoot() {
    return bridgeInvoke<{ root: string }>("torrent_get_download_root");
  },
  async getStatus(): Promise<TorrentClientStatus> {
    return bridgeInvoke<TorrentClientStatus>("torrent_get_status");
  },
  async openDownloadRoot() {
    return bridgeInvoke<{ status: string }>("torrent_open_download_root");
  },
  async openSavePath(id: string) {
    return bridgeInvoke<{ status: string }>("torrent_open_save_path", { id });
  },
};
