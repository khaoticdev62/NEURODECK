import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from "vitest";

describe("bridgeAdapter internals", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ shouldAdvanceTime: false });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("BridgeError carries code, command, status, and requestId", async () => {
    const mod = await import("./bridgeAdapter");
    const err = new mod.BridgeError(
      "command_timeout",
      "timed out",
      "test_cmd",
      504,
      "req-123"
    );
    expect(err.name).toBe("BridgeError");
    expect(err.code).toBe("command_timeout");
    expect(err.message).toBe("timed out");
    expect(err.command).toBe("test_cmd");
    expect(err.status).toBe(504);
    expect(err.requestId).toBe("req-123");
  });

  it("isBridgeError distinguishes typed errors from plain errors", async () => {
    const mod = await import("./bridgeAdapter");
    const typed = new mod.BridgeError("network_error", "boom", "x", 0);
    expect(mod.isBridgeError(typed)).toBe(true);
    expect(mod.isBridgeError(new Error("boom"))).toBe(false);
    expect(mod.isBridgeError("boom")).toBe(false);
    expect(mod.isBridgeError(null)).toBe(false);
  });

  it("computeBackoff grows exponentially and respects the cap", async () => {
    const mod = await import("./bridgeAdapter");
    const v0 = mod.computeBackoff(0, 500, 8_000);
    expect(v0).toBeGreaterThanOrEqual(500);
    expect(v0).toBeLessThan(650);

    const v1 = mod.computeBackoff(1, 500, 8_000);
    expect(v1).toBeGreaterThanOrEqual(1_000);
    expect(v1).toBeLessThan(1_300);

    const capped = mod.computeBackoff(10, 500, 8_000);
    expect(capped).toBe(8_000);
  });

  it("isSafeReadCommand classifies read vs mutation commands", async () => {
    const mod = await import("./bridgeAdapter");
    expect(mod.isSafeReadCommand("list_projects")).toBe(true);
    expect(mod.isSafeReadCommand("get_context_stats")).toBe(true);
    expect(mod.isSafeReadCommand("search_memory")).toBe(true);
    expect(mod.isSafeReadCommand("discover_installed_models")).toBe(true);
    expect(mod.isSafeReadCommand("send_command")).toBe(false);
    expect(mod.isSafeReadCommand("exec_code_stream")).toBe(false);
  });
});

describe("bridgeAdapter WebSocket reconnect", () => {
  class MockWebSocket {
    static instances: MockWebSocket[] = [];
    url: string;
    readyState = 0;
    onopen: (() => void) | null = null;
    onclose: (() => void) | null = null;
    onerror: (() => void) | null = null;
    onmessage: ((ev: { data: string }) => void) | null = null;

    constructor(url: string) {
      this.url = url;
      MockWebSocket.instances.push(this);
    }

    simulateOpen() {
      this.readyState = 1;
      this.onopen?.();
    }

    simulateClose() {
      this.readyState = 3;
      this.onclose?.();
    }
  }

  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ shouldAdvanceTime: false });
    MockWebSocket.instances = [];
    global.WebSocket = MockWebSocket as unknown as typeof WebSocket;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("reconnects with exponential backoff capped at 30 s", async () => {
    await import("./bridgeAdapter");
    expect(MockWebSocket.instances.length).toBe(1);

    MockWebSocket.instances[0].simulateClose();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(MockWebSocket.instances.length).toBe(2);

    MockWebSocket.instances[1].simulateClose();
    await vi.advanceTimersByTimeAsync(2_000);
    expect(MockWebSocket.instances.length).toBe(3);

    MockWebSocket.instances[2].simulateClose();
    await vi.advanceTimersByTimeAsync(4_000);
    expect(MockWebSocket.instances.length).toBe(4);

    // Cap
    MockWebSocket.instances[3].simulateClose();
    await vi.advanceTimersByTimeAsync(8_000);
    expect(MockWebSocket.instances.length).toBe(5);

    MockWebSocket.instances[4].simulateClose();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(MockWebSocket.instances.length).toBe(6);

    // After a successful open the delay resets.
    MockWebSocket.instances[5].simulateOpen();
    MockWebSocket.instances[5].simulateClose();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(MockWebSocket.instances.length).toBe(7);
  });
});

describe("bridgeInvoke", () => {
  let fetchMock: MockInstance<typeof fetch>;

  beforeEach(() => {
    vi.resetModules();
    fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    global.WebSocket = class {
      url = "";
      readyState = 0;
      onopen: (() => void) | null = null;
      onclose: (() => void) | null = null;
      onerror: (() => void) | null = null;
      onmessage: ((ev: { data: string }) => void) | null = null;
      constructor(url: string) {
        this.url = url;
      }
    } as unknown as typeof WebSocket;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns parsed JSON on success", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: "p1" }],
    } as Response);
    const mod = await import("./bridgeAdapter");
    const result = await mod.neurodeckApi.projects.list();
    expect(result).toEqual([{ id: "p1" }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init!.body as string);
    expect(body.request_id).toBeDefined();
  });

  it("retries safe-read commands on transient HTTP errors", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () =>
          JSON.stringify({ error: { code: "command_error", message: "overloaded" } }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: "p2" }],
      } as Response);

    const mod = await import("./bridgeAdapter");
    const promise = mod.neurodeckApi.projects.list();
    await vi.advanceTimersByTimeAsync(10_000);
    const result = await promise;

    expect(result).toEqual([{ id: "p2" }]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry mutation commands", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 503,
      text: async () =>
        JSON.stringify({ error: { code: "command_error", message: "overloaded" } }),
    } as Response);

    const mod = await import("./bridgeAdapter");
    const promise = mod.neurodeckApi.store.setConfig("key", "value");
    await expect(promise).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws a typed BridgeError for structured backend errors", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () =>
        JSON.stringify({
          error: {
            code: "command_not_found",
            message: "Unknown command: unknown_cmd",
            command: "unknown_cmd",
            request_id: "req-abc",
          },
        }),
    } as Response);

    const mod = await import("./bridgeAdapter");
    await expect(mod.neurodeckApi.projects.list()).rejects.toSatisfy((err) => {
      return (
        mod.isBridgeError(err) &&
        err.code === "command_not_found" &&
        err.status === 404 &&
        err.requestId === "req-abc"
      );
    });
  });

  it("aborts the request after the timeout and throws client_timeout", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    let aborted = false;
    fetchMock.mockImplementation((_url: unknown, init?: RequestInit) => {
      let rejectPromise: (reason?: unknown) => void = () => {};
      const promise = new Promise<Response>((_, reject) => {
        rejectPromise = reject;
      });
      if (init?.signal) {
        init.signal.addEventListener("abort", () => {
          aborted = true;
          rejectPromise(new DOMException("The operation was aborted.", "AbortError"));
        });
      }
      return promise;
    });

    const mod = await import("./bridgeAdapter");
    const promise = mod.neurodeckApi.store.setConfig("key", "value");
    await Promise.all([
      vi.advanceTimersByTimeAsync(35_000),
      expect(promise).rejects.toSatisfy((err) => {
        return mod.isBridgeError(err) && err.code === "client_timeout";
      }),
    ]);
    expect(aborted).toBe(true);
  });
});
