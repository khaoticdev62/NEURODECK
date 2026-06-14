import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast } from '../../components/primitives/Toast';

type ToastTone = 'info' | 'success' | 'warning' | 'error';

// Helper component that exposes toast() via a button
function Trigger({ message = 'Hello', tone = 'info' as ToastTone, duration = 60000 }: {
  message?: string;
  tone?: ToastTone;
  duration?: number;
} = {}) {
  const { toast } = useToast();
  return <button onClick={() => toast(message, tone, duration)}>Show toast</button>;
}

// Structural tests — no fake timers needed, use very long duration so toasts don't auto-dismiss
describe('ToastProvider / useToast — structure', () => {
  it('throws when useToast is used outside ToastProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Trigger />)).toThrow('useToast must be used inside <ToastProvider>');
    spy.mockRestore();
  });

  it('renders notification region with correct aria attributes', () => {
    render(<ToastProvider><Trigger /></ToastProvider>);
    const region = screen.getByRole('region', { name: 'Notifications' });
    expect(region.getAttribute('aria-live')).toBe('polite');
  });

  it('renders toast message when triggered', async () => {
    render(<ToastProvider><Trigger message="Hello there" /></ToastProvider>);
    await userEvent.click(screen.getByRole('button', { name: 'Show toast' }));
    expect(screen.getByText('Hello there')).toBeDefined();
  });

  it('renders toast with role="status"', async () => {
    render(<ToastProvider><Trigger /></ToastProvider>);
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
  });

  it('renders Dismiss button on each toast', async () => {
    render(<ToastProvider><Trigger /></ToastProvider>);
    await userEvent.click(screen.getByRole('button', { name: 'Show toast' }));
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeDefined();
  });

  it('manually dismisses toast via Dismiss button', async () => {
    render(<ToastProvider><Trigger message="Manual" /></ToastProvider>);
    await userEvent.click(screen.getByRole('button', { name: 'Show toast' }));
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByText('Manual')).toBeNull();
  });

  it('caps toast stack at 5', async () => {
    render(<ToastProvider><Trigger /></ToastProvider>);
    const trigger = screen.getByRole('button');
    for (let i = 0; i < 7; i++) {
      await userEvent.click(trigger);
    }
    expect(screen.getAllByRole('status').length).toBeLessThanOrEqual(5);
  });

  it('renders error tone classes', async () => {
    render(<ToastProvider><Trigger message="Oops" tone="error" /></ToastProvider>);
    await userEvent.click(screen.getByRole('button'));
    const toast = screen.getByText('Oops').closest('[role="status"]');
    expect(toast?.className).toContain('nd-toast--error');
  });

  it('renders success tone classes', async () => {
    render(<ToastProvider><Trigger message="Done!" tone="success" /></ToastProvider>);
    await userEvent.click(screen.getByRole('button'));
    const toast = screen.getByText('Done!').closest('[role="status"]');
    expect(toast?.className).toContain('nd-toast--success');
  });

  it('renders warning tone classes', async () => {
    render(<ToastProvider><Trigger message="Watch out" tone="warning" /></ToastProvider>);
    await userEvent.click(screen.getByRole('button'));
    const toast = screen.getByText('Watch out').closest('[role="status"]');
    expect(toast?.className).toContain('nd-toast--warning');
  });

  it('renders info tone classes by default', async () => {
    render(<ToastProvider><Trigger message="FYI" tone="info" /></ToastProvider>);
    await userEvent.click(screen.getByRole('button'));
    const toast = screen.getByText('FYI').closest('[role="status"]');
    expect(toast?.className).toContain('nd-toast--info');
  });
});

// Timer-dependent tests — use fake timers + advanceTimers so userEvent cooperates
describe('ToastProvider / useToast — timer behavior', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    // shouldAdvanceTime: true lets userEvent's internal setTimeout-based pointer
    // event sequence fire at real speed; vi.advanceTimersByTime() still lets us
    // fast-forward the toast auto-dismiss timer precisely.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
  });
  afterEach(() => { vi.useRealTimers(); });

  it('auto-dismisses toast after durationMs', async () => {
    render(<ToastProvider><Trigger message="Temp" duration={2000} /></ToastProvider>);
    await user.click(screen.getByRole('button'));
    expect(screen.getByText('Temp')).toBeDefined();
    act(() => { vi.advanceTimersByTime(2001); });
    expect(screen.queryByText('Temp')).toBeNull();
  });

  it('does not dismiss before durationMs has elapsed', async () => {
    // Use a long duration and advance only partway so real-time drift never tips us over
    render(<ToastProvider><Trigger message="Persist" duration={30000} /></ToastProvider>);
    await user.click(screen.getByRole('button'));
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByText('Persist')).toBeDefined();
  });
});
