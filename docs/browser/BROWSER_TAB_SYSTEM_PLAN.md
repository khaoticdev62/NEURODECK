# Browser Tab System Plan

This document outlines the design and lifecycle management of the multi-tab layout in **NeuroBrowse**.

## 1. Lifecycle of a Tab
- **Creation**:
  1. The user requests a new tab.
  2. `BrowserTabManager` creates a `BrowserTab` record with a unique UUID.
  3. `BrowserViewManager` spins up a new `WebContentsView` linked to that tab and profile.
- **Switching**:
  1. The user selects a tab from the tab strip.
  2. The previously active tab's `WebContentsView` is detached from `mainWindow.contentView` and set to `setVisible(false)`.
  3. The newly active tab's `WebContentsView` is attached to `mainWindow.contentView`, set to `setVisible(true)`, and focused.
  4. Web contents bounds are recalculated based on the layout ref.
- **Pinning**:
  - Pinned tabs are displayed as compact icon-only items on the left side of the tab strip.
  - Pinned tabs cannot be closed without being unpinned first.
- **Muting**:
  - Sets `webContents.setAudioMuted(isMuted)`.
- **Duplication**:
  - Clones the URL and settings of an existing tab, opening a new tab navigating to the same URL.
- **Destruction**:
  - Clones or closes the web contents cleanly, calling `webContents.destroy()` to prevent memory leaks.
