import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { neurodeckApi, runtimeTypeToProvider } from "../../services/bridgeAdapter";
import type { CliCommandDef } from "../../types/neurodeck";

describe("bridgeAdapter — Live IPC and API Connections", () => {
  let fetchSpy: any;

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve("ok"),
      } as Response)
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("memory.addFact sends live post request to bridge", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: "added", id: "manual-123" }),
    } as Response);

    const res = await neurodeckApi.memory.addFact("this is a test fact");

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toContain("/api/memory_add_fact");
    expect(init.method).toBe("POST");

    const body = JSON.parse(init.body);
    expect(body).toEqual({ content: "this is a test fact" });
    expect(res).toEqual({ status: "added", id: "manual-123" });
  });

  it("cliMaker.list sends live post request to bridge", async () => {
    const mockCommands: CliCommandDef[] = [
      {
        id: "123",
        name: "test",
        description: "desc",
        icon: "zap",
        category: "shell",
        action: { type: "Shell", data: { command: "echo 1", cwd: null } },
        shortcut: null,
        radial_bind: null,
      },
    ];

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockCommands),
    } as Response);

    const res = await neurodeckApi.cliMaker.list();

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toContain("/api/cli_list_commands");
    expect(init.method).toBe("POST");
    expect(res).toEqual(mockCommands);
  });

  it("cliMaker.create sends live JSON-serialized command payload", async () => {
    const cmd: CliCommandDef = {
      id: "cmd-new",
      name: "hello",
      description: "says hello",
      icon: "zap",
      category: "prompt",
      action: { type: "Prompt", data: { template: "hello", use_llm: false } },
      shortcut: null,
      radial_bind: null,
    };

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: "cmd-new" }),
    } as Response);

    const res = await neurodeckApi.cliMaker.create(cmd);

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toContain("/api/cli_create_command");
    expect(init.method).toBe("POST");

    const body = JSON.parse(init.body);
    expect(body).toEqual({ def: JSON.stringify(cmd) });
    expect(res).toEqual({ id: "cmd-new" });
  });

  it("cliMaker.update sends id and JSON-serialized command payload", async () => {
    const cmd: CliCommandDef = {
      id: "cmd-existing",
      name: "hello-updated",
      description: "says hello updated",
      icon: "zap",
      category: "prompt",
      action: { type: "Prompt", data: { template: "hello", use_llm: false } },
      shortcut: null,
      radial_bind: null,
    };

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: "updated" }),
    } as Response);

    const res = await neurodeckApi.cliMaker.update("cmd-existing", cmd);

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toContain("/api/cli_update_command");

    const body = JSON.parse(init.body);
    expect(body).toEqual({ id: "cmd-existing", def: JSON.stringify(cmd) });
    expect(res).toEqual({ status: "updated" });
  });

  it("cliMaker.delete sends live delete request", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: "deleted" }),
    } as Response);

    const res = await neurodeckApi.cliMaker.delete("cmd-123");

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toContain("/api/cli_delete_command");

    const body = JSON.parse(init.body);
    expect(body).toEqual({ id: "cmd-123" });
    expect(res).toEqual({ status: "deleted" });
  });

  it("cliMaker.run sends command id and run arguments", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ output: "test-output" }),
    } as Response);

    const res = await neurodeckApi.cliMaker.run("cmd-123", "some-args");

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toContain("/api/cli_run_command");

    const body = JSON.parse(init.body);
    expect(body).toEqual({ id: "cmd-123", args: "some-args" });
    expect(res).toEqual({ output: "test-output" });
  });
});

describe("bridgeAdapter — runtime type mapping", () => {
  it("maps known runtime types to AIProvider values", () => {
    expect(runtimeTypeToProvider("ollama")).toBe("ollama");
    expect(runtimeTypeToProvider("lm_studio")).toBe("lmstudio");
    expect(runtimeTypeToProvider("llama_cpp_server")).toBe("llama_cpp");
    expect(runtimeTypeToProvider("openai_compatible_local")).toBe("openai_compat");
    expect(runtimeTypeToProvider("openai_compatible_remote")).toBe("openai_compat");
    expect(runtimeTypeToProvider("custom_http_provider")).toBe("openai_compat");
  });

  it("falls back to ollama for unknown runtime types", () => {
    expect(runtimeTypeToProvider("some_future_runtime")).toBe("ollama");
  });
});

describe("bridgeAdapter — model support API surface", () => {
  it("exposes all new model/provider/recovery methods", () => {
    expect(typeof neurodeckApi.models.listProviderRuntimes).toBe("function");
    expect(typeof neurodeckApi.models.discoverInstalledModels).toBe("function");
    expect(typeof neurodeckApi.models.getProviderHealth).toBe("function");
    expect(typeof neurodeckApi.models.runModelProbe).toBe("function");
    expect(typeof neurodeckApi.models.getCompatibilityScores).toBe("function");
    expect(typeof neurodeckApi.models.pickBestLocalModel).toBe("function");
    expect(typeof neurodeckApi.models.getAgentModelPolicies).toBe("function");
    expect(typeof neurodeckApi.models.getAllowedModelsForAgent).toBe("function");
    expect(typeof neurodeckApi.models.validateAgentModel).toBe("function");
    expect(typeof neurodeckApi.models.evaluateRecovery).toBe("function");
    expect(typeof neurodeckApi.models.recordRecoveryEvent).toBe("function");
    expect(typeof neurodeckApi.models.getRecoveryEventLog).toBe("function");
  });
});

describe("bridgeAdapter — diagnostics connection matrix", () => {
  let fetchSpy: any;

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
        text: () => Promise.resolve("ok"),
      } as Response)
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getConnectionMatrix returns ok with parsed data", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            runtime_id: "ollama",
            runtime_type: "ollama",
            label: "Ollama",
            state: "connected",
            latency_ms: 12,
            models: ["llama3.1:8b"],
            checked_at: "2026-06-11T12:00:00Z",
          },
        ]),
    } as Response);

    const res = await neurodeckApi.diagnostics.getConnectionMatrix();

    expect(res.ok).toBe(true);
    expect(res.data).toHaveLength(1);
    expect(res.data[0].id).toBe("ollama");
    expect(res.data[0].state).toBe("connected");
  });
});
