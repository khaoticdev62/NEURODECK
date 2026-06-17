import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserView } from "../../features/browser/BrowserView";

// Mock child components
vi.mock("../../features/browser-vpn/BrowserVpnPanel", () => ({
  BrowserVpnPanel: () => <div data-testid="vpn-panel">VPN Panel</div>,
}));

// Mock Lucide icons to keep snapshot/render simple
vi.mock("lucide-react", () => ({
  Globe: () => <div data-testid="icon-globe" />,
  ArrowLeft: () => <div data-testid="icon-arrow-left" />,
  ArrowRight: () => <div data-testid="icon-arrow-right" />,
  RotateCcw: () => <div data-testid="icon-rotate-ccw" />,
  Home: () => <div data-testid="icon-home" />,
  ExternalLink: () => <div data-testid="icon-external-link" />,
  Eye: () => <div data-testid="icon-eye" />,
  EyeOff: () => <div data-testid="icon-eye-off" />,
  Save: () => <div data-testid="icon-save" />,
  ZoomIn: () => <div data-testid="icon-zoom-in" />,
  ZoomOut: () => <div data-testid="icon-zoom-out" />,
  Focus: () => <div data-testid="icon-focus" />,
  Search: () => <div data-testid="icon-search" />,
  X: () => <div data-testid="icon-x" />,
  Star: () => <div data-testid="icon-star" />,
  BookOpen: () => <div data-testid="icon-book-open" />,
  Shield: () => <div data-testid="icon-shield" />,
  ShieldCheck: () => <div data-testid="icon-shield-check" />,
  Download: () => <div data-testid="icon-download" />,
  Clock: () => <div data-testid="icon-clock" />,
  Trash2: () => <div data-testid="icon-trash-2" />,
  BookMarked: () => <div data-testid="icon-book-marked" />,
  ChevronDown: () => <div data-testid="icon-chevron-down" />,
  Plus: () => <div data-testid="icon-plus" />,
  Pin: () => <div data-testid="icon-pin" />,
  Volume2: () => <div data-testid="icon-volume-2" />,
  VolumeX: () => <div data-testid="icon-volume-x" />,
  Lock: () => <div data-testid="icon-lock" />,
  Unlock: () => <div data-testid="icon-unlock" />,
  Settings: () => <div data-testid="icon-settings" />,
  AlertTriangle: () => <div data-testid="icon-alert-triangle" />,
  Terminal: () => <div data-testid="icon-terminal" />,
  Info: () => <div data-testid="icon-info" />,
  RefreshCw: () => <div data-testid="icon-refresh-cw" />,
}));

const mockGetTabs = vi.fn();
const mockGetActiveTab = vi.fn();
const mockGetProfiles = vi.fn();
const mockGetDownloads = vi.fn();
const mockGetHistory = vi.fn();
const mockGetBookmarks = vi.fn();
const mockCreateTab = vi.fn();
const mockCloseTab = vi.fn();
const mockSwitchTab = vi.fn();
const mockNavigate = vi.fn();
const mockGoBack = vi.fn();
const mockReload = vi.fn();
const mockHardReload = vi.fn();
const mockClearBrowserData = vi.fn();
const mockNormalizeUrl = vi.fn();
const mockShow = vi.fn();
const mockHide = vi.fn();
const mockSetBounds = vi.fn();
const mockOnBrowserEvent = vi.fn().mockReturnValue(() => {});

const mockOpenExternal = vi.fn();
const mockBrowserAdblockStatus = vi.fn();

describe("BrowserView Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup window globals
    window.neurodeck = {
      browser: {
        getTabs: mockGetTabs,
        getActiveTab: mockGetActiveTab,
        getProfiles: mockGetProfiles,
        getDownloads: mockGetDownloads,
        getHistory: mockGetHistory,
        getBookmarks: mockGetBookmarks,
        createTab: mockCreateTab,
        closeTab: mockCloseTab,
        switchTab: mockSwitchTab,
        navigate: mockNavigate,
        goBack: mockGoBack,
        reload: mockReload,
        hardReload: mockHardReload,
        clearBrowserData: mockClearBrowserData,
        normalizeUrl: mockNormalizeUrl,
        show: mockShow,
        hide: mockHide,
        setBounds: mockSetBounds,
        onBrowserEvent: mockOnBrowserEvent,
      } as any,
    } as any;

    window.electronAPI = {
      openExternal: mockOpenExternal,
      browserAdblockStatus: mockBrowserAdblockStatus,
    } as any;

    window.alert = vi.fn();

    // Default mock resolves
    mockGetTabs.mockResolvedValue([
      {
        id: "tab-1",
        profileId: "default",
        title: "Google",
        url: "https://google.com",
        displayUrl: "google.com",
        state: "ready",
        canGoBack: true,
        canGoForward: false,
        isLoading: false,
      },
    ]);
    mockGetActiveTab.mockResolvedValue({
      id: "tab-1",
      displayUrl: "google.com",
      url: "https://google.com",
    });
    mockGetProfiles.mockResolvedValue([{ id: "default", name: "Default" }]);
    mockGetDownloads.mockResolvedValue([]);
    mockGetBookmarks.mockResolvedValue([]);
    mockGetHistory.mockResolvedValue([]);
    mockNormalizeUrl.mockResolvedValue({ url: "https://google.com" });
    mockBrowserAdblockStatus.mockResolvedValue({ enabled: true });
  });

  it("renders address bar and active tab title", async () => {
    render(<BrowserView />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Search or enter web URL...")).toBeDefined();
      expect(screen.getByText("Google")).toBeDefined();
    });
  });

  it("renders custom fallback overlay when active tab state is 'new'", async () => {
    mockGetTabs.mockResolvedValue([
      {
        id: "tab-new",
        profileId: "default",
        title: "New Tab",
        url: "about:blank",
        state: "new",
        canGoBack: false,
        canGoForward: false,
        isLoading: false,
      },
    ]);
    mockGetActiveTab.mockResolvedValue({ id: "tab-new", url: "about:blank", state: "new" });

    render(<BrowserView />);

    await waitFor(() => {
      expect(screen.getByText("New Session Tab")).toBeDefined();
      expect(screen.getByPlaceholderText("Search Google or enter web address...")).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText("Search Google or enter web address...");
    fireEvent.change(searchInput, { target: { value: "https://github.com" } });
    fireEvent.keyDown(searchInput, { key: "Enter", code: "Enter" });

    expect(mockNormalizeUrl).toHaveBeenCalledWith("https://github.com");
  });

  it("renders custom fallback overlay when active tab state is 'error'", async () => {
    mockGetTabs.mockResolvedValue([
      {
        id: "tab-error",
        profileId: "default",
        title: "Error Page",
        url: "https://broken-site.xyz",
        state: "error",
        canGoBack: true,
        canGoForward: false,
        isLoading: false,
        diagnostics: {
          lastErrorCode: "ERR_NAME_NOT_RESOLVED",
          lastErrorMessage: "DNS error occurred.",
        },
      },
    ]);
    mockGetActiveTab.mockResolvedValue({
      id: "tab-error",
      url: "https://broken-site.xyz",
      state: "error",
    });

    render(<BrowserView />);

    await waitFor(() => {
      expect(screen.getByText("Failed to Load Page")).toBeDefined();
    });

    const diagnosticsBtn = screen.getByText("Diagnostic Information");
    fireEvent.click(diagnosticsBtn);

    expect(screen.getByText("ERR_NAME_NOT_RESOLVED")).toBeDefined();
    expect(screen.getByText("DNS error occurred.")).toBeDefined();

    const openExternallyBtn = screen.getByRole("button", { name: /open externally/i });
    fireEvent.click(openExternallyBtn);
    expect(mockOpenExternal).toHaveBeenCalledWith("https://broken-site.xyz");
  });

  it("renders custom fallback overlay when active tab state is 'crashed'", async () => {
    mockGetTabs.mockResolvedValue([
      {
        id: "tab-crashed",
        profileId: "default",
        title: "Crashed",
        url: "https://crashy.com",
        state: "crashed",
        crashCount: 2,
        canGoBack: false,
        isLoading: false,
      },
    ]);
    mockGetActiveTab.mockResolvedValue({
      id: "tab-crashed",
      url: "https://crashy.com",
      state: "crashed",
    });

    render(<BrowserView />);

    await waitFor(() => {
      expect(screen.getByText("Renderer Process Crashed")).toBeDefined();
    });

    expect(screen.getByText("Consecutive Crashes:")).toBeDefined();
    expect(screen.getByText("2")).toBeDefined();

    const recoverBtn = screen.getByRole("button", { name: /recover tab/i });
    fireEvent.click(recoverBtn);
    expect(mockReload).toHaveBeenCalledWith("tab-crashed");
  });

  it("renders custom fallback overlay when active tab state is 'blocked'", async () => {
    mockGetTabs.mockResolvedValue([
      {
        id: "tab-blocked",
        profileId: "default",
        title: "Blocked",
        url: "file:///etc/passwd",
        state: "blocked",
        canGoBack: true,
        isLoading: false,
      },
    ]);
    mockGetActiveTab.mockResolvedValue({
      id: "tab-blocked",
      url: "file:///etc/passwd",
      state: "blocked",
    });

    render(<BrowserView />);

    await waitFor(() => {
      expect(screen.getByText("Website Access Blocked")).toBeDefined();
      expect(screen.getByText("LOCAL_FILE_SYSTEM_ISOLATION")).toBeDefined();
    });
  });

  it("allows clearing browser/profile data from the New Tab page", async () => {
    mockGetTabs.mockResolvedValue([
      {
        id: "tab-new",
        profileId: "default",
        title: "New Tab",
        url: "about:blank",
        state: "new",
        canGoBack: false,
        isLoading: false,
      },
    ]);
    mockGetActiveTab.mockResolvedValue({ id: "tab-new", url: "about:blank", state: "new" });
    mockClearBrowserData.mockResolvedValue({ success: true });

    render(<BrowserView />);

    await waitFor(() => {
      expect(screen.getByText("Clear Current Tab Data")).toBeDefined();
    });

    const clearCurrentBtn = screen.getByText("Clear Current Tab Data");
    fireEvent.click(clearCurrentBtn);

    expect(mockClearBrowserData).toHaveBeenCalledWith("currentTab");

    const clearAllBtn = screen.getByText("Purge All Sessions Data");
    fireEvent.click(clearAllBtn);

    expect(mockClearBrowserData).toHaveBeenCalledWith("all");
  });
});
