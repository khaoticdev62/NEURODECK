import * as path from "path";
import type { DownloadItem } from "../../../shared/browser/browserContracts";
import { browserProfileService } from "./browserProfileService";

export class BrowserDownloadService {
  private activeDownloads: Map<string, DownloadItem> = new Map();

  sanitizeFilename(filename: string): string {
    // Prevent path traversal by keeping only the basename
    const base = path.basename(filename);
    // Remove any trailing null characters or weird punctuation
    return base.replace(/[\0-\x1F\x7F"#$&*+,/:;<=>?@\[\\\]^`{|}~]/g, "_");
  }

  isHighRiskExtension(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    const highRisk = [".exe", ".msi", ".bat", ".sh", ".cmd", ".js", ".vbs", ".scr", ".pif"];
    return highRisk.includes(ext);
  }

  canDownload(profileId: string): boolean {
    const profile = browserProfileService.getProfile(profileId);
    if (!profile) return false;
    return profile.policy.allowDownloads;
  }

  registerDownload(item: Omit<DownloadItem, "receivedBytes" | "state" | "startTime">): DownloadItem {
    const fresh: DownloadItem = {
      ...item,
      filename: this.sanitizeFilename(item.filename),
      receivedBytes: 0,
      state: "progressing",
      startTime: new Date().toISOString(),
    };

    this.activeDownloads.set(item.id, fresh);
    return fresh;
  }

  updateDownloadProgress(id: string, receivedBytes: number, state: DownloadItem["state"]) {
    const dl = this.activeDownloads.get(id);
    if (dl) {
      dl.receivedBytes = receivedBytes;
      dl.state = state;
      if (state === "completed" || state === "cancelled" || state === "interrupted") {
        dl.endTime = new Date().toISOString();
      }
    }
  }

  getDownload(id: string): DownloadItem | undefined {
    return this.activeDownloads.get(id);
  }

  listDownloads(): DownloadItem[] {
    return Array.from(this.activeDownloads.values());
  }
}

export const browserDownloadService = new BrowserDownloadService();
