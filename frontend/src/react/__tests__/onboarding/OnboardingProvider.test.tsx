import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OnboardingProvider } from '../../onboarding/OnboardingProvider';
import type { NeuroDeckState, NeuroDeckAction } from '../../types/neurodeck';

vi.mock('../../onboarding/OnboardingOverlay', () => ({
  OnboardingOverlay: ({ mode }: { mode: string }) => (
    <div data-testid="onboarding-overlay" data-mode={mode} />
  ),
}));

const baseState = {
  showOnboarding: false,
  onboardingMode: 'setup',
  activeView: 'chat',
  deckMode: false,
  models: [],
  sessions: [],
  plugins: [],
} as unknown as NeuroDeckState;

const dispatch = vi.fn() as unknown as React.Dispatch<NeuroDeckAction>;

describe('OnboardingProvider', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders children without overlay when showOnboarding is false', () => {
    render(
      <OnboardingProvider state={baseState} dispatch={dispatch}>
        <span>app</span>
      </OnboardingProvider>,
    );
    expect(screen.getByText('app')).toBeDefined();
    expect(screen.queryByTestId('onboarding-overlay')).toBeNull();
  });

  it('does not mount overlay when onboardingMode is setup', () => {
    const state = { ...baseState, showOnboarding: true, onboardingMode: 'setup' } as unknown as NeuroDeckState;
    render(
      <OnboardingProvider state={state} dispatch={dispatch}>
        <span>app</span>
      </OnboardingProvider>,
    );
    expect(screen.queryByTestId('onboarding-overlay')).toBeNull();
  });

  it('mounts overlay via portal when mode is tour', () => {
    const state = { ...baseState, showOnboarding: true, onboardingMode: 'tour' } as unknown as NeuroDeckState;
    render(
      <OnboardingProvider state={state} dispatch={dispatch}>
        <span>app</span>
      </OnboardingProvider>,
    );
    const overlay = screen.getByTestId('onboarding-overlay');
    expect(overlay).toBeDefined();
    expect(overlay.getAttribute('data-mode')).toBe('tour');
  });

  it('mounts overlay when mode is contextual', () => {
    const state = { ...baseState, showOnboarding: true, onboardingMode: 'contextual' } as unknown as NeuroDeckState;
    render(
      <OnboardingProvider state={state} dispatch={dispatch}>
        <span>app</span>
      </OnboardingProvider>,
    );
    expect(screen.getByTestId('onboarding-overlay').getAttribute('data-mode')).toBe('contextual');
  });

  it('mounts overlay when mode is whats-new', () => {
    const state = { ...baseState, showOnboarding: true, onboardingMode: 'whats-new' } as unknown as NeuroDeckState;
    render(
      <OnboardingProvider state={state} dispatch={dispatch}>
        <span>app</span>
      </OnboardingProvider>,
    );
    expect(screen.getByTestId('onboarding-overlay').getAttribute('data-mode')).toBe('whats-new');
  });
});

// Required so TS allows JSX without explicit React import
import type React from 'react';
