import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StepWelcome } from '../../../components/onboarding/steps/StepWelcome';

describe('StepWelcome', () => {
  it('renders heading', () => {
    render(<StepWelcome appVersion="1.8.0" isSteamDeck={false} precheckPassed={true} prechecking={false} />);
    expect(screen.getByRole('heading', { level: 2 })).toBeDefined();
  });

  it('renders app version', () => {
    render(<StepWelcome appVersion="1.8.0" isSteamDeck={false} precheckPassed={true} prechecking={false} />);
    expect(screen.getByText('v1.8.0')).toBeDefined();
  });

  it('shows pre-check spinner while checking', () => {
    render(<StepWelcome appVersion="1.8.0" isSteamDeck={false} precheckPassed={false} prechecking={true} />);
    expect(screen.getByText('Pre-checking system environment...')).toBeDefined();
  });

  it('shows success message when precheck passed', () => {
    render(<StepWelcome appVersion="1.8.0" isSteamDeck={false} precheckPassed={true} prechecking={false} />);
    expect(screen.getByText('Basic diagnostic requirements passing. You can safely skip setup.')).toBeDefined();
  });

  it('shows warning message when precheck failed', () => {
    render(<StepWelcome appVersion="1.8.0" isSteamDeck={false} precheckPassed={false} prechecking={false} />);
    expect(screen.getByText('Initial environment issue detected. Setup recommended before launching.')).toBeDefined();
  });

  it('shows "Steam Deck Console" when isSteamDeck is true', () => {
    render(<StepWelcome appVersion="1.8.0" isSteamDeck={true} precheckPassed={true} prechecking={false} />);
    expect(screen.getByText('Steam Deck Console')).toBeDefined();
  });

  it('shows "Standard PC Workstation" when isSteamDeck is false', () => {
    render(<StepWelcome appVersion="1.8.0" isSteamDeck={false} precheckPassed={true} prechecking={false} />);
    expect(screen.getByText('Standard PC Workstation')).toBeDefined();
  });
});
