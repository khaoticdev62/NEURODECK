import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { neurodeckApi } from '../../services/bridgeAdapter';
import type { CliCommandDef } from '../../types/neurodeck';

describe('bridgeAdapter — Live IPC and API Connections', () => {
  let fetchSpy: any;

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('ok'),
      } as Response)
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('memory.addFact sends live post request to bridge', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: 'added', id: 'manual-123' }),
    } as Response);

    const res = await neurodeckApi.memory.addFact('this is a test fact');

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toContain('/api/memory_add_fact');
    expect(init.method).toBe('POST');
    
    const body = JSON.parse(init.body);
    expect(body).toEqual({ content: 'this is a test fact' });
    expect(res).toEqual({ status: 'added', id: 'manual-123' });
  });

  it('cliMaker.list sends live post request to bridge', async () => {
    const mockCommands: CliCommandDef[] = [
      {
        id: '123',
        name: 'test',
        description: 'desc',
        icon: 'zap',
        category: 'shell',
        action: { type: 'Shell', data: { command: 'echo 1', cwd: null } },
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
    expect(url).toContain('/api/cli_list_commands');
    expect(init.method).toBe('POST');
    expect(res).toEqual(mockCommands);
  });

  it('cliMaker.create sends live JSON-serialized command payload', async () => {
    const cmd: CliCommandDef = {
      id: 'cmd-new',
      name: 'hello',
      description: 'says hello',
      icon: 'zap',
      category: 'prompt',
      action: { type: 'Prompt', data: { template: 'hello', use_llm: false } },
      shortcut: null,
      radial_bind: null,
    };

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 'cmd-new' }),
    } as Response);

    const res = await neurodeckApi.cliMaker.create(cmd);

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toContain('/api/cli_create_command');
    expect(init.method).toBe('POST');
    
    const body = JSON.parse(init.body);
    expect(body).toEqual({ def: JSON.stringify(cmd) });
    expect(res).toEqual({ id: 'cmd-new' });
  });

  it('cliMaker.update sends id and JSON-serialized command payload', async () => {
    const cmd: CliCommandDef = {
      id: 'cmd-existing',
      name: 'hello-updated',
      description: 'says hello updated',
      icon: 'zap',
      category: 'prompt',
      action: { type: 'Prompt', data: { template: 'hello', use_llm: false } },
      shortcut: null,
      radial_bind: null,
    };

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: 'updated' }),
    } as Response);

    const res = await neurodeckApi.cliMaker.update('cmd-existing', cmd);

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toContain('/api/cli_update_command');
    
    const body = JSON.parse(init.body);
    expect(body).toEqual({ id: 'cmd-existing', def: JSON.stringify(cmd) });
    expect(res).toEqual({ status: 'updated' });
  });

  it('cliMaker.delete sends live delete request', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: 'deleted' }),
    } as Response);

    const res = await neurodeckApi.cliMaker.delete('cmd-123');

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toContain('/api/cli_delete_command');
    
    const body = JSON.parse(init.body);
    expect(body).toEqual({ id: 'cmd-123' });
    expect(res).toEqual({ status: 'deleted' });
  });

  it('cliMaker.run sends command id and run arguments', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ output: 'test-output' }),
    } as Response);

    const res = await neurodeckApi.cliMaker.run('cmd-123', 'some-args');

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toContain('/api/cli_run_command');
    
    const body = JSON.parse(init.body);
    expect(body).toEqual({ id: 'cmd-123', args: 'some-args' });
    expect(res).toEqual({ output: 'test-output' });
  });
});
