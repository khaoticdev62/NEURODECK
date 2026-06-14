import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StepPackages } from '../../../components/onboarding/steps/StepPackages';

const mockGetStatus = vi.fn();
const mockGetRecommended = vi.fn();
const mockInstall = vi.fn();
const mockOnProgress = vi.fn().mockReturnValue(() => {});

vi.mock('../../../services/bridgeAdapter', () => ({
  neurodeckApi: {
    npm: {
      getStatus: () => mockGetStatus(),
      getRecommended: () => mockGetRecommended(),
      install: (name: string) => mockInstall(name),
      onProgress: (cb: any) => mockOnProgress(cb),
    },
  },
}));

const RECOMMENDED = [
  { id: 'typescript-language-server', name: 'typescript-language-server', description: 'LSP for TypeScript', category: 'LSP', defaultSelected: true },
  { id: 'prettier', name: 'prettier', description: 'Code formatter', category: 'Formatter', defaultSelected: true },
  { id: 'eslint', name: 'eslint', description: 'JS linter', category: 'Linter', defaultSelected: false },
];

describe('StepPackages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetStatus.mockResolvedValue({ node: true, npm: true, nodeVersion: 'v20.0.0', npmVersion: '10.0.0' });
    mockGetRecommended.mockResolvedValue(RECOMMENDED);
    mockInstall.mockResolvedValue({ name: 'typescript-language-server', installedVersion: '4.3.3', enabled: true });
  });

  it('renders the heading', async () => {
    render(<StepPackages />);
    await waitFor(() => expect(screen.getByRole('heading', { level: 2 })).toBeDefined());
  });

  it('shows loading state while fetching', () => {
    mockGetStatus.mockReturnValue(new Promise(() => {}));
    render(<StepPackages />);
    expect(screen.getByText(/loading recommended packages/i)).toBeDefined();
  });

  it('shows node and npm status badges when available', async () => {
    render(<StepPackages />);
    await waitFor(() => expect(screen.getByText(/Node v20/)).toBeDefined());
    expect(screen.getByText(/npm 10/)).toBeDefined();
  });

  it('shows warning when node is not available', async () => {
    mockGetStatus.mockResolvedValue({ node: false, npm: false });
    render(<StepPackages />);
    await waitFor(() => expect(screen.getByText(/Node.js and npm were not detected/i)).toBeDefined());
  });

  it('renders recommended packages with default selections', async () => {
    render(<StepPackages />);
    await waitFor(() => expect(screen.getByText('typescript-language-server')).toBeDefined());
    expect(screen.getByText('prettier')).toBeDefined();
    expect(screen.getByText('eslint')).toBeDefined();
  });

  it('calls onProgress subscription on mount and cleans up on unmount', async () => {
    const cleanup = vi.fn();
    mockOnProgress.mockReturnValue(cleanup);
    const { unmount } = render(<StepPackages />);
    await waitFor(() => expect(mockOnProgress).toHaveBeenCalled());
    unmount();
    expect(cleanup).toHaveBeenCalled();
  });

  it('installs selected packages when Install button is clicked', async () => {
    render(<StepPackages onInstallComplete={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('typescript-language-server')).toBeDefined());

    await userEvent.click(screen.getByRole('button', { name: /install/i }));
    await waitFor(() => expect(mockInstall).toHaveBeenCalled());
    // Only pre-selected packages (defaultSelected=true) should be installed
    const installedNames = mockInstall.mock.calls.map(([n]) => n);
    expect(installedNames).toContain('typescript-language-server');
    expect(installedNames).toContain('prettier');
    expect(installedNames).not.toContain('eslint');
  });
});
