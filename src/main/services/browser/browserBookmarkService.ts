import * as fs from "fs";
import * as path from "path";
import type { BrowserBookmark } from "../../../shared/browser/browserContracts";
import { browserProfileService } from "./browserProfileService";

export class BrowserBookmarkService {
  private bookmarksPath: string;
  private bookmarks: BrowserBookmark[] = [];

  constructor() {
    try {
      const { app } = require("electron");
      this.bookmarksPath = path.join(app.getPath("userData"), "browser-bookmarks.json");
    } catch {
      this.bookmarksPath = path.join(process.cwd(), "browser-bookmarks-test.json");
    }
    this.loadBookmarks();
  }

  private loadBookmarks() {
    try {
      if (fs.existsSync(this.bookmarksPath)) {
        const content = fs.readFileSync(this.bookmarksPath, "utf-8");
        // Support migrating old bookmarks structure if it was a flat array without profileId
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          this.bookmarks = parsed.map((b: any) => ({
            id: b.id || `bk-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            profileId: b.profileId || "default",
            title: b.title || b.url,
            url: b.url,
            createdAt: b.createdAt ? new Date(b.createdAt).toISOString() : new Date().toISOString(),
            updatedAt: b.updatedAt ? new Date(b.updatedAt).toISOString() : new Date().toISOString(),
          }));
        } else {
          this.bookmarks = parsed;
        }
      }
    } catch (_) {
      this.bookmarks = [];
    }
  }

  private saveBookmarks() {
    try {
      fs.writeFileSync(this.bookmarksPath, JSON.stringify(this.bookmarks, null, 2), "utf-8");
    } catch (_) {}
  }

  addBookmark(url: string, title: string, profileId: string): BrowserBookmark | null {
    const profile = browserProfileService.getProfile(profileId);
    if (!profile || !profile.storage.bookmarksEnabled) {
      return null;
    }

    // Avoid duplicate bookmarks for same profile
    const existing = this.bookmarks.find((b) => b.url === url && b.profileId === profileId);
    if (existing) {
      existing.title = title || url;
      existing.updatedAt = new Date().toISOString();
      this.saveBookmarks();
      return existing;
    }

    const newBookmark: BrowserBookmark = {
      id: `bk-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      profileId,
      title: title || url,
      url,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.bookmarks.push(newBookmark);
    this.saveBookmarks();
    return newBookmark;
  }

  getBookmarks(profileId?: string): BrowserBookmark[] {
    if (profileId) {
      return this.bookmarks.filter((b) => b.profileId === profileId);
    }
    return this.bookmarks;
  }

  deleteBookmark(id: string) {
    this.bookmarks = this.bookmarks.filter((b) => b.id !== id);
    this.saveBookmarks();
  }
}

export const browserBookmarkService = new BrowserBookmarkService();
