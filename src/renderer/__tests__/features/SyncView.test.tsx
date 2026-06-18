import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

type BridgeHandler = (payload: unknown) => void;

const {
  mockListPeers,
  mockListActive,
  mockSendFile,
  mockRespond,
  mockCancel,
  mockRetry,
  mockGroupCode,
  mockAddManualPeer,
  mockTrustedPeers,
  mockProfiles,
  mockDiagnostics,
  mockClearHistory,
  mockGetInboxPath,
  mockListenBridge,
  bridgeHandlers,
} = vi.hoisted(() => ({
  mockListPeers: vi.fn(),
  mockListActive: vi.fn(),
  mockSendFile: vi.fn(),
  mockRespond: vi.fn(),
  mockCancel: vi.fn(),
  mockRetry: vi.fn(),
  mockGroupCode: vi.fn(),
  mockAddManualPeer: vi.fn(),
  mockTrustedPeers: vi.fn(),
  mockProfiles: vi.fn(),
  mockDiagnostics: vi.fn(),
  mockClearHistory: vi.fn(),
  mockGetInboxPath: vi.fn(),
  mockListenBridge: vi.fn(),
  bridgeHandlers: {} as Record<string, BridgeHandler>,
}));

vi.mock("../../services/bridgeAdapter", () => ({
  neurodeckApi: {
    transfer: {
      listPeers: mockListPeers,
      listActive: mockListActive,
      sendFile: mockSendFile,
      respond: mockRespond,
      cancel: mockCancel,
      retry: mockRetry,
      groupCode: mockGroupCode,
      addManualPeer: mockAddManualPeer,
      trustedPeers: mockTrustedPeers,
      profiles: mockProfiles,
      diagnostics: mockDiagnostics,
      clearHistory: mockClearHistory,
      getInboxPath: mockGetInboxPath,
    },
  },
  listenBridge: mockListenBridge,
}));

import { SyncView } from "../../features/sync/SyncView";

const PEER = {
  ip: "10.0.0.2",
  hostname: "Deck Mate",
  os: "linux",
  port: 42000,
  is_warpinator: true,
};

const FAILED_TRANSFER = {
  id: "tx-failed",
  filename: "build.zip",
  size: 4096,
  progress: 1024,
  status: "Failed",
  direction: "Outgoing",
  peer_ip: "10.0.0.2",
  peer_name: "Deck Mate",
} as const;

const COMPLETED_TRANSFER = {
  id: "tx-done",
  filename: "notes.txt",
  size: 128,
  progress: 128,
  status: "Completed",
  direction: "Incoming",
  peer_ip: "10.0.0.3",
  peer_name: "Winpinator",
} as const;

describe("SyncView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(bridgeHandlers)) {
      delete bridgeHandlers[key];
    }

    mockListPeers.mockResolvedValue([PEER]);
    mockListActive.mockResolvedValue([]);
    mockSendFile.mockResolvedValue({ status: "started", transfer_id: "tx-new" });
    mockRespond.mockResolvedValue({ status: "responded" });
    mockCancel.mockResolvedValue({ status: "cancelled" });
    mockRetry.mockResolvedValue({ status: "ok", new_transfer_id: "tx-retry" });
    mockGroupCode.mockResolvedValue({ status: "ok", code: "team-code" });
    mockAddManualPeer.mockResolvedValue({ status: "ok", peer_ip: "10.0.0.4" });
    mockTrustedPeers.mockResolvedValue({ status: "ok", peers: [] });
    mockProfiles.mockResolvedValue({ status: "ok", profiles: [] });
    mockDiagnostics.mockResolvedValue({
      status: "ok",
      diagnostics: {
        mdns_active: true,
        peer_count: 1,
        active_transfers: 0,
        tcp_port: 18338,
        grpc_port: 42000,
        group_code_set: true,
        download_dir: "C:\\Users\\thecr\\AppData\\Roaming\\neurodeck\\neurodeck_transfers",
      },
    });
    mockClearHistory.mockResolvedValue({ status: "ok", cleared: 1 });
    mockGetInboxPath.mockResolvedValue({
      status: "ok",
      path: "C:\\Users\\thecr\\AppData\\Roaming\\neurodeck\\neurodeck_transfers",
    });
    mockListenBridge.mockImplementation((event: string, handler: BridgeHandler) => {
      bridgeHandlers[event] = handler;
      return () => {
        delete bridgeHandlers[event];
      };
    });
  });

  it("renders the dashboard tab and loads transfer data", async () => {
    render(<SyncView />);

    expect(screen.getByTestId("sync-view")).toBeDefined();
    expect(screen.getByRole("tab", { name: /dashboard/i }).getAttribute("aria-selected")).toBe(
      "true"
    );
    await waitFor(() => expect(mockListPeers).toHaveBeenCalled());
    await waitFor(() => expect(mockListActive).toHaveBeenCalled());
  });

  it("switches tabs", async () => {
    render(<SyncView />);

    await userEvent.click(screen.getByRole("tab", { name: /devices/i }));
    expect(screen.getByText(/discovered on lan/i)).toBeDefined();
    expect(screen.getByText("Deck Mate")).toBeDefined();
  });

  it("shows incoming request dialog from bridge event and accepts it", async () => {
    render(<SyncView />);
    await waitFor(() => expect(mockListenBridge).toHaveBeenCalled());

    await act(async () => {
      bridgeHandlers.transfer_incoming?.({
        id: "tx-incoming",
        filename: "save.dat",
        size: 2048,
        progress: 0,
        status: "Pending",
        direction: "Incoming",
        peer_ip: "10.0.0.5",
        peer_name: "Winpinator",
      });
    });

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/incoming file from winpinator/i)).toBeDefined();
    await userEvent.click(within(dialog).getByRole("button", { name: /accept/i }));

    expect(mockRespond).toHaveBeenCalledWith("tx-incoming", true);
  });

  it("calls retry for failed outgoing transfers", async () => {
    mockListActive.mockResolvedValue([FAILED_TRANSFER]);

    render(<SyncView />);
    await waitFor(() => expect(screen.getByText("build.zip")).toBeDefined());

    await userEvent.click(screen.getByRole("button", { name: /retry transfer of build\.zip/i }));
    expect(mockRetry).toHaveBeenCalledWith("tx-failed");
  });

  it("guards clear history behind a confirmation dialog", async () => {
    mockListActive.mockResolvedValue([COMPLETED_TRANSFER]);

    render(<SyncView />);
    await userEvent.click(screen.getByRole("tab", { name: /history/i }));
    await waitFor(() => expect(screen.getByText("notes.txt")).toBeDefined());

    await userEvent.click(screen.getByRole("button", { name: /clear history/i }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/clear transfer history/i)).toBeDefined();

    await userEvent.click(within(dialog).getByRole("button", { name: /clear history/i }));
    expect(mockClearHistory).toHaveBeenCalledWith();
  });

  it("renders the queue tab for retryable transfers", async () => {
    mockListActive.mockResolvedValue([FAILED_TRANSFER]);

    render(<SyncView />);
    await userEvent.click(screen.getByRole("tab", { name: /queue/i }));
    await waitFor(() => expect(screen.getByText("build.zip")).toBeDefined());

    await userEvent.click(screen.getByRole("button", { name: /retry build\.zip/i }));
    expect(mockRetry).toHaveBeenCalledWith("tx-failed");
  });

  it("loads profiles tab and saves a profile", async () => {
    render(<SyncView />);
    await userEvent.click(screen.getByRole("tab", { name: /profiles/i }));
    await waitFor(() => expect(mockProfiles).toHaveBeenCalledWith("list"));

    await userEvent.clear(screen.getByRole("textbox", { name: /profile name/i }));
    await userEvent.type(screen.getByRole("textbox", { name: /profile name/i }), "Lab VPN");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(mockProfiles).toHaveBeenCalledWith("add", expect.objectContaining({ name: "Lab VPN" }));
  });

  it("adds a manual VPN peer from the VPN/WAN tab", async () => {
    render(<SyncView />);
    await userEvent.click(screen.getByRole("tab", { name: /vpn\/wan/i }));

    await userEvent.type(screen.getByRole("textbox", { name: /vpn peer host/i }), "10.8.0.2");
    await userEvent.type(screen.getByRole("textbox", { name: /vpn peer alias/i }), "WireGuard PC");
    await userEvent.click(screen.getByRole("button", { name: /add/i }));

    expect(mockAddManualPeer).toHaveBeenCalledWith("10.8.0.2", 42000, "WireGuard PC");
  });
});
