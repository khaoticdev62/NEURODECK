import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PackagesPanel } from '../../features/settings/PackagesPanel';

const mockGetStatus = vi.fn();
const mockList = vi.fn();
const mockInstall = vi.fn();
const mockUninstall = vi.fn();
const mockUpdate = vi.fn();
const mockOnProgress = vi.fn().mockReturnValue(() => {});

vi.mock('../../services/bridgeAdapter', () => ({
  neurodeckApi: {
    npm: {
      getStatus: () => mockGetStatus(),
      list: () => mockList(),
      install: (name: string, version?: string) => mockInstall(name, version),
      uninstall: (name: string) => mockUninstall(name),
      update: (name: string) => mockUpdate(name),
      onProgress: (cb: any) => mockOnProgress(cb),
    },
  },
}));

const PACKAGES = [
  { name: 'typescript-language-server', installedVersion: '4.3.3', enabled: true, category: 'LSP' },
  { name: 'prettier', installedVersion: '3.2.0', enabled: true, category: 'Formatter' },
];

describe('PackagesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetStatus.mockResolvedValue({ node: true, npm: true, nodeVersion: 'v20.0.0', npmVersion: '10.0.0' });
    mockList.mockResolvedValue(PACKAGES);
    mockInstall.mockResolvedValue({ name: 'eslint', installedVersion: '9.0.0', enabled: true });
    mockUninstall.mockResolvedValue({ status: 'ok', name: 'prettier' });
    mockUpdate.mockResolvedValue({ name: 'typescript-language-server', installedVersion: '4.4.0', enabled: true });
  });

  it('renders installed packages after load', async () => {
    render(<PackagesPanel />);
    await waitFor(() => expect(screen.getByText('typescript-language-server')).toBeDefined());
    expect(screen.getByText('prettier')).toBeDefined();
  });

  it('shows node and npm version badges', async () => {
    render(<PackagesPanel />);
    await waitFor(() => expect(screen.getByText(/Node v20/)).toBeDefined());
    expect(screen.getByText(/npm 10/)).toBeDefined();
  });

  it('installs a package when name is entered and Install button is clicked', async () => {
    mockList.mockResolvedValue([]);
    render(<PackagesPanel />);
    await waitFor(() => expect(mockList).toHaveBeenCalled());

    const nameInput = screen.getByPlaceholderText('package-name');
    await userEvent.type(nameInput, 'eslint');
    await userEvent.click(screen.getByRole('button', { name: /^install$/i }));

    await waitFor(() => expect(mockInstall).toHaveBeenCalledWith('eslint', undefined));
  });

  it('calls uninstall when Uninstall button is clicked for a package', async () => {
    render(<PackagesPanel />);
    await waitFor(() => expect(screen.getByText('prettier')).toBeDefined());

    const uninstallBtn = screen.getByRole('button', { name: /uninstall prettier/i });
    await userEvent.click(uninstallBtn);

    await waitFor(() => expect(mockUninstall).toHaveBeenCalledWith('prettier'));
  });

  it('calls update when Update button is clicked for a package', async () => {
    render(<PackagesPanel />);
    await waitFor(() => expect(screen.getByText('typescript-language-server')).toBeDefined());

    const updateBtn = screen.getAllByRole('button', { name: /update/i })[0];
    await userEvent.click(updateBtn);

    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
  });

  it('registers and cleans up progress listener on mount/unmount', async () => {
    const cleanup = vi.fn();
    mockOnProgress.mockReturnValue(cleanup);
    const { unmount } = render(<PackagesPanel />);
    await waitFor(() => expect(mockOnProgress).toHaveBeenCalled());
    unmount();
    expect(cleanup).toHaveBeenCalled();
  });

  it('shows error message when bridge call fails', async () => {
    mockGetStatus.mockRejectedValue(new Error('bridge unavailable'));
    render(<PackagesPanel />);
    await waitFor(() => expect(screen.getByText(/bridge unavailable/i)).toBeDefined());
  });

  it('shows empty state when no packages are installed', async () => {
    mockList.mockResolvedValue([]);
    render(<PackagesPanel />);
    await waitFor(() => expect(screen.getByText('No npm packages installed.')).toBeDefined());
  });
});
