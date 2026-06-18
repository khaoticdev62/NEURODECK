import {
  BookMarked,
  Clock,
  Eye,
  EyeOff,
  Globe,
  Save,
  Search,
  Shield,
  ShieldCheck,
  Star,
  Terminal,
} from "lucide-react";
import { EmptyState } from "../../components/primitives/EmptyState";
import { BrowserVpnPanel } from "../browser-vpn/BrowserVpnPanel";
import { Button } from "../../components/primitives/Button";
import { FocusTrapContainer } from "../../components/primitives/FocusTrapContainer";
import { IconButton } from "../../components/primitives/IconButton";
import { AddressBar } from "./components/AddressBar";
import { BrowserTabStrip } from "./components/BrowserTabStrip";
import { DiagnosticsPanel } from "./components/DiagnosticsPanel";
import { DownloadsPanel } from "./components/DownloadsPanel";
import { FindBar } from "./components/FindBar";

import { GlobalToolbar } from "./components/GlobalToolbar";
import { NavigationToolbar } from "./components/NavigationToolbar";
import { NoticeToast } from "./components/NoticeToast";
import { PermissionPrompt } from "./components/PermissionPrompt";
import { ProfileSwitcher } from "./components/ProfileSwitcher";
import { SidebarDrawer } from "./components/SidebarDrawer";
import { BlockedScreen } from "./components/screens/BlockedScreen";
import { CrashedScreen } from "./components/screens/CrashedScreen";
import { ErrorScreen } from "./components/screens/ErrorScreen";
import { NewTabScreen } from "./components/screens/NewTabScreen";
import { useBrowser } from "./hooks/useBrowser";

export function BrowserView() {
  const browser = useBrowser();

  const {
    tabs,
    activeTabId,
    activeTab,
    activeProfile,
    urlInput,
    findOpen,
    findText,
    showSidebar,
    history,
    bookmarks,
    downloads,
    permissions,
    showProfilesMenu,
    showDiagnostics,
    showVpnPanel,
    diagnosticsReport,
    visible,
    adBlockEnabled,
    activeDownloadCount,
    showDownloadsMenu,
    errorDetailsOpen,
    notice,
    isBookmarked,
    viewportRef,
    urlInputRef,
    setUrlInput,
    setFindOpen,
    setFindText,
    setShowSidebar,
    setShowProfilesMenu,
    setShowDiagnostics,
    setShowVpnPanel,
    setShowDownloadsMenu,
    setErrorDetailsOpen,
    createTab,
    closeTab,
    switchTab,
    navigate,
    goBack,
    goForward,
    refresh,
    stop,
    toggleVisibility,
    saveToMemory,
    handleFind,
    submitFind,
    toggleBookmark,
    deleteBookmark,
    deleteHistoryEntry,
    clearHistory,
    handleToggleAdBlock,
    changeProfile,
    clearProfileData,
    handleClearData,
    openDevTools,
    respondToPermission,
    loadDiagnostics,
    loadDownloads,
  } = browser;

  return (
    <div
      className="browser-container flex h-full flex-col bg-nd-surface-app text-nd-text-primary select-none"
      data-controller-zone="browser"
    >
      <NoticeToast notice={notice} />
      <PermissionPrompt permissions={permissions} onRespond={respondToPermission} />

      {/* Title / Tab Strip */}
      <div
        className="flex items-center justify-between border-b border-nd-border-subtle bg-nd-surface-secondary/30 px-4 py-2 shrink-0"
        data-controller-zone="toolbar"
      >
        <BrowserTabStrip
          tabs={tabs}
          activeTabId={activeTabId}
          onSwitchTab={switchTab}
          onCloseTab={closeTab}
          onCreateTab={createTab}
        />
        <GlobalToolbar
          showDownloadsMenu={showDownloadsMenu}
          activeDownloadCount={activeDownloadCount}
          onToggleDownloadsMenu={() => setShowDownloadsMenu((v) => !v)}
          showDiagnostics={showDiagnostics}
          onToggleDiagnostics={() => {
            setShowDiagnostics((v) => !v);
            if (!showDiagnostics) loadDiagnostics();
          }}
          showVpnPanel={showVpnPanel}
          onToggleVpnPanel={() => setShowVpnPanel((v) => !v)}
        />
      </div>

      {/* Navigation & Address Bar Toolbar */}
      <div
        className="flex flex-wrap items-center gap-2 border-b border-nd-border-subtle bg-nd-surface-app/60 px-4 py-2 shrink-0"
        data-controller-zone="browser"
      >
        <NavigationToolbar
          activeTab={activeTab}
          onGoBack={goBack}
          onGoForward={goForward}
          onRefresh={refresh}
          onStop={stop}
          onHome={() => navigate("about:blank")}
        />
        <AddressBar
          urlInput={urlInput}
          onUrlInputChange={setUrlInput}
          onNavigate={navigate}
          urlInputRef={urlInputRef}
          activeTab={activeTab}
        />

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          <IconButton
            aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
            variant={isBookmarked ? "accent" : "subtle"}
            size="md"
            onClick={toggleBookmark}
            aria-pressed={isBookmarked}
          >
            <Star
              className="h-4 w-4"
              fill={isBookmarked ? "currentColor" : "none"}
              aria-hidden="true"
            />
          </IconButton>

          <IconButton
            aria-label={adBlockEnabled ? "Disable ad blocker" : "Enable ad blocker"}
            variant={adBlockEnabled ? "accent" : "subtle"}
            size="md"
            onClick={handleToggleAdBlock}
            aria-pressed={adBlockEnabled}
          >
            {adBlockEnabled ? (
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Shield className="h-4 w-4" aria-hidden="true" />
            )}
          </IconButton>

          <ProfileSwitcher
            showProfilesMenu={showProfilesMenu}
            onToggleProfilesMenu={() => {
              setShowProfilesMenu((v) => !v);
              setShowDownloadsMenu(false);
              setShowDiagnostics(false);
            }}
            profiles={browser.profiles}
            activeTab={activeTab}
            activeProfile={activeProfile}
            onChangeProfile={changeProfile}
            onClearProfileData={clearProfileData}
          />

          <IconButton
            aria-label="Find in page"
            variant={findOpen ? "accent" : "subtle"}
            size="md"
            onClick={handleFind}
            aria-pressed={findOpen}
          >
            <Search className="h-4 w-4" aria-hidden="true" />
          </IconButton>

          <IconButton
            aria-label="History"
            variant={showSidebar === "history" ? "accent" : "subtle"}
            size="md"
            onClick={() => {
              if (showSidebar === "history") setShowSidebar(null);
              else setShowSidebar("history");
            }}
            aria-pressed={showSidebar === "history"}
          >
            <Clock className="h-4 w-4" aria-hidden="true" />
          </IconButton>

          <IconButton
            aria-label="Bookmarks"
            variant={showSidebar === "bookmarks" ? "accent" : "subtle"}
            size="md"
            onClick={() => {
              if (showSidebar === "bookmarks") setShowSidebar(null);
              else setShowSidebar("bookmarks");
            }}
            aria-pressed={showSidebar === "bookmarks"}
          >
            <BookMarked className="h-4 w-4" aria-hidden="true" />
          </IconButton>

          <IconButton
            aria-label="Inspect (DevTools)"
            variant="subtle"
            size="md"
            onClick={openDevTools}
          >
            <Terminal className="h-4 w-4" aria-hidden="true" />
          </IconButton>

          <IconButton
            aria-label="Save page to memory fact"
            variant="subtle"
            size="md"
            onClick={saveToMemory}
          >
            <Save className="h-4 w-4" aria-hidden="true" />
          </IconButton>

          <IconButton
            aria-label={visible ? "Hide viewport" : "Show viewport"}
            variant="subtle"
            size="md"
            onClick={toggleVisibility}
          >
            {visible ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </IconButton>
        </div>
      </div>

      <FindBar
        findOpen={findOpen}
        findText={findText}
        onFindTextChange={setFindText}
        onClose={() => setFindOpen(false)}
        onSubmit={submitFind}
      />

      <DiagnosticsPanel
        showDiagnostics={showDiagnostics}
        onClose={() => setShowDiagnostics(false)}
        diagnosticsReport={diagnosticsReport}
        onRefresh={loadDiagnostics}
      />

      <DownloadsPanel
        showDownloadsMenu={showDownloadsMenu}
        onClose={() => setShowDownloadsMenu(false)}
        downloads={downloads}
        onRefresh={loadDownloads}
      />

      {showVpnPanel && (
        <FocusTrapContainer
          active={showVpnPanel}
          onEscape={() => setShowVpnPanel(false)}
          className="absolute inset-0 z-modal flex items-start justify-end bg-nd-bg/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-label="Browser VPN"
        >
          <BrowserVpnPanel visible={showVpnPanel} onClose={() => setShowVpnPanel(false)} />
        </FocusTrapContainer>
      )}

      {/* Main Viewport & Collapsible Sidebar Drawer */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Viewport Overlay */}
        <div
          ref={viewportRef}
          aria-label="Browser viewport"
          className={`flex-1 overflow-hidden relative ${
            visible &&
            activeTab &&
            activeTab.state !== "new" &&
            activeTab.state !== "error" &&
            activeTab.state !== "crashed" &&
            activeTab.state !== "blocked"
              ? ""
              : "hidden"
          }`}
          style={{ background: "transparent" }}
        />
        {!visible && (
          <div className="flex flex-1 items-center justify-center p-4">
            <EmptyState
              icon={Globe}
              title="Viewport Suspended"
              description="Guest frame process detached to save Steam Deck CPU / GPU / Battery resource. Tap the eye icon in toolbar to resume."
              action={
                <Button variant="primary" size="sm" onClick={toggleVisibility}>
                  Resume Session View
                </Button>
              }
            />
          </div>
        )}

        {visible && (
          <>
            {(!activeTab || activeTab.state === "new") && (
              <NewTabScreen onNavigate={navigate} onClearData={handleClearData} />
            )}
            {activeTab?.state === "error" && (
              <ErrorScreen
                activeTab={activeTab}
                onGoBack={goBack}
                onRefresh={refresh}
                errorDetailsOpen={errorDetailsOpen}
                onToggleErrorDetails={() => setErrorDetailsOpen((v) => !v)}
              />
            )}
            {activeTab?.state === "crashed" && (
              <CrashedScreen
                activeTab={activeTab}
                onCloseTab={closeTab}
                onRefresh={refresh}
              />
            )}
            {activeTab?.state === "blocked" && (
              <BlockedScreen activeTab={activeTab} onGoBack={goBack} />
            )}
          </>
        )}

        <SidebarDrawer
          showSidebar={showSidebar}
          onClose={() => setShowSidebar(null)}
          history={history}
          bookmarks={bookmarks}
          onNavigate={navigate}
          onDeleteHistoryEntry={deleteHistoryEntry}
          onDeleteBookmark={deleteBookmark}
          onClearHistory={clearHistory}
        />
      </div>

    </div>
  );
}
