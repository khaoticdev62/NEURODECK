import { browserBookmarkService } from "../../services/browser/browserBookmarkService";

export function registerBrowserBookmarksHandlers(ipcMain: any) {
  ipcMain.handle("browser:get-bookmarks", async (_event: any, payload: any) => {
    const { profileId } = payload || {};
    return browserBookmarkService.getBookmarks(profileId);
  });

  ipcMain.handle("browser:add-bookmark", async (_event: any, payload: any) => {
    const { url, title, profileId } = payload || {};
    if (!url || !profileId) return { success: false, error: "Missing url or profileId" };
    const b = browserBookmarkService.addBookmark(url, title, profileId);
    return { success: !!b, bookmark: b };
  });

  ipcMain.handle("browser:delete-bookmark", async (_event: any, payload: any) => {
    const { id } = payload || {};
    if (!id) return { success: false };
    browserBookmarkService.deleteBookmark(id);
    return { success: true };
  });
}
