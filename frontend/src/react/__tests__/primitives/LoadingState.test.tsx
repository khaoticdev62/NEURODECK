import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingState } from '../../components/primitives/LoadingState';

describe('LoadingState', () => {
  it('renders with default label "Loading…"', () => {
    render(<LoadingState />);
    expect(screen.getByText('Loading…')).toBeDefined();
  });

  it('renders custom label', () => {
    render(<LoadingState label="Fetching plugins…" />);
    expect(screen.getByText('Fetching plugins…')).toBeDefined();
  });

  it('has role="status" for screen reader announcements', () => {
    render(<LoadingState />);
    expect(screen.getByRole('status')).toBeDefined();
  });

  it('aria-label matches the visible label', () => {
    render(<LoadingState label="Loading plugins…" />);
    const status = screen.getByRole('status');
    expect(status.getAttribute('aria-label')).toBe('Loading plugins…');
  });

  it('applies fullHeight class when fullHeight=true', () => {
    const { container } = render(<LoadingState fullHeight />);
    const div = container.querySelector('[role="status"]');
    expect(div?.className).toContain('h-full');
  });

  it('does not apply h-full when fullHeight=false', () => {
    const { container } = render(<LoadingState />);
    const div = container.querySelector('[role="status"]');
    expect(div?.className).not.toContain('h-full');
  });
});
