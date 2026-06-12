import * as fs from "fs";
import * as path from "path";
import type { BrowserHistoryEntry } from "../../../shared/browser/browserContracts";
import { browserProfileService } from "./browserProfileService";

export class BrowserHistoryService {
  private historyPath: string;
  private history: BrowserHistoryEntry[] = [];

  constructor() {
    try {
      const { app } = require("electron");
      this.historyPath = path.join(app.getPath("userData"), "browser-history.json");
    } catch {
      this.historyPath = path.join(process.cwd(), "browser-history-test.json");
    }
    this.loadHistory();
  }

  private loadHistory() {
    try {
      if (fs.existsSync(this.historyPath)) {
        this.history = JSON.parse(fs.readFileSync(this.historyPath, "utf-8"));
      }
    } catch (_) {
      this.history = [];
    }
  }

  private saveHistory() {
    try {
      fs.writeFileSync(this.historyPath, JSON.stringify(this.history, null, 2), "utf-8");
    } catch (_) {}
  }

  addEntry(url: string, title: string, profileId: string) {
    const profile = browserProfileService.getProfile(profileId);
    if (!profile || !profile.storage.historyEnabled) {
      return; // Do not persist for private profiles or history disabled
    }

    // Check if entry exists to update visitCount
    const existing = this.history.find((h) => h.url === url && h.profileId === profileId);
    if (existing) {
      existing.visitCount++;
      existing.lastVisitedAt = new Date().toISOString();
      if (title && title !== url) {
        existing.title = title;
      }
    } else {
      const newEntry: BrowserHistoryEntry = {
        id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        profileId,
        url,
        title: title || url,
        visitCount: 1,
        lastVisitedAt: new Date().toISOString(),
      };
      this.history.unshift(newEntry);
    }

    // Keep history capped at 1000 items
    if (this.history.length > 1000) {
      this.history = this.history.slice(0, 1000);
    }

    this.saveHistory();
  }

  getHistory(profileId?: string): BrowserHistoryEntry[] {
    if (profileId) {
      return this.history.filter((h) => h.profileId === profileId);
    }
    return this.history;
  }

  deleteEntry(id: string) {
    this.history = this.history.filter((h) => h.id !== id);
    this.saveHistory();
  }

  clearHistory(profileId?: string) {
    if (profileId) {
      this.history = this.history.filter((h) => h.profileId !== profileId);
    } else {
      this.history = [];
    }
    this.saveHistory();
  }
}

export const browserHistoryService = new BrowserHistoryService();
