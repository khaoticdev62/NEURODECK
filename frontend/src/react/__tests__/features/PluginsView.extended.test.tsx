import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { mockList, mockToggle, mockValidate, mockReload } = vi.hoisted(() => ({
  mockList: vi.fn(),
  mockToggle: vi.fn(),
  mockValidate: vi.fn(),
  mockReload: vi.fn(),
}));

vi.mock('../../services/bridgeAdapter', () => ({
  neurodeckApi: {
    plugins: {
      list: mockList,
      toggle: mockToggle,
      validate: mockValidate,
      reload: mockReload,
      installFromUrl: vi.fn().mockResolvedValue({}),
      uninstall: vi.fn().mockResolvedValue({}),
    },
  },
  listenBridge: vi.fn().mockReturnValue(() => {}),
}));

import { PluginsView } from '../../features/plugins/PluginsView';

const PLUGINS_LIST = [
  {
    id: 'safe-lua',
    file_name: 'safe-lua.lua',
    name: 'Safe Lua Plugin',
    description: 'A benign script using standard API access',
    enabled: false,
    author: 'Alice',
    version: '1.2.0',
    tags: ['utility'],
    marketplace: false,
    permissions: ['model_access', 'notification_access'],
  },
  {
    id: 'danger-js',
    file_name: 'danger-js.js',
    name: 'Dangerous JS Plugin',
    description: 'Requires shell execution to run tasks',
    enabled: false,
    author: 'Bob',
    version: '0.9.0',
    tags: ['developer'],
    marketplace: true,
    permissions: ['shell_execution', 'filesystem_write'],
  },
];

describe('PluginsView — Extended Features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({ plugins: PLUGINS_LIST });
    mockValidate.mockResolvedValue({ passed: true, errors: [], warnings: [] });
    mockToggle.mockResolvedValue({});
    mockReload.mockResolvedValue({});
  });

  it('calculates and renders statistics in top summary cards', async () => {
    render(<PluginsView />);
    await waitFor(() => screen.getByText('Safe Lua Plugin'));

    expect(screen.getByText('Total Installed')).toBeDefined();
    // 2 installed, 0 active, 2 disabled (none active in mock PLUGINS_LIST)
    expect(screen.getAllByText('2')).toBeDefined();
  });

  it('filters plugins by search text', async () => {
    render(<PluginsView />);
    await waitFor(() => screen.getByText('Safe Lua Plugin'));

    const searchInput = screen.getByPlaceholderText(/search plugins by/i);
    await userEvent.type(searchInput, 'Benign');

    expect(screen.getByText('Safe Lua Plugin')).toBeDefined();
    expect(screen.queryByText('Dangerous JS Plugin')).toBeNull();
  });

  it('filters plugins by runtime selection', async () => {
    render(<PluginsView />);
    await waitFor(() => screen.getByText('Safe Lua Plugin'));

    const selectRuntime = screen.getAllByRole('combobox')[1]; // search index 1 is runtime
    await userEvent.selectOptions(selectRuntime, 'lua');

    expect(screen.getByText('Safe Lua Plugin')).toBeDefined();
    expect(screen.queryByText('Dangerous JS Plugin')).toBeNull();
  });

  it('filters plugins by permission risk level', async () => {
    render(<PluginsView />);
    await waitFor(() => screen.getByText('Safe Lua Plugin'));

    const selectRisk = screen.getAllByRole('combobox')[2]; // search index 2 is risk
    await userEvent.selectOptions(selectRisk, 'high');

    expect(screen.getByText('Dangerous JS Plugin')).toBeDefined();
    expect(screen.queryByText('Safe Lua Plugin')).toBeNull();
  });

  it('displays validation status and details in the side drawer when selected', async () => {
    render(<PluginsView />);
    await waitFor(() => screen.getByText('Safe Lua Plugin'));

    // Select the Safe Lua plugin card
    await userEvent.click(screen.getByText('Safe Lua Plugin'));

    await waitFor(() => {
      // It should query validation on selection
      expect(mockValidate).toHaveBeenCalledWith('safe-lua.lua');
      expect(screen.getAllByText('Alice')).toBeDefined();
      expect(screen.getByText('Passed QA Gate')).toBeDefined();
    });
  });

  it('prompts the user with a warning modal before enabling high-risk permissions', async () => {
    render(<PluginsView />);
    await waitFor(() => screen.getByText('Dangerous JS Plugin'));

    // Enable the dangerous JS plugin (which has shell_execution)
    const toggleBtn = screen.getByRole('switch', { name: /enable dangerous js plugin/i });
    await userEvent.click(toggleBtn);

    // It should render the security warning modal instead of toggling immediately
    expect(screen.getByText('Dangerous Permission Request')).toBeDefined();
    expect(screen.getByText('Allow high-risk access permissions?')).toBeDefined();
    expect(mockToggle).not.toHaveBeenCalled();

    // Confirm enable
    const confirmBtn = screen.getByRole('button', { name: /enable anyway/i });
    await userEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockToggle).toHaveBeenCalledWith('danger-js.js', true);
    });
  });

  it('allows copying diagnostic details of selected plugin to clipboard', async () => {
    // Mock navigator.clipboard
    const mockClipboardWrite = vi.fn().mockResolvedValue({});
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockClipboardWrite },
      writable: true,
    });

    render(<PluginsView />);
    await waitFor(() => screen.getByText('Safe Lua Plugin'));

    await userEvent.click(screen.getByText('Safe Lua Plugin'));

    const copyBtn = await screen.findByRole('button', { name: /copy diagnostics/i });
    await userEvent.click(copyBtn);

    expect(mockClipboardWrite).toHaveBeenCalled();
    expect(screen.getByText('Copied Details!')).toBeDefined();
  });
});
