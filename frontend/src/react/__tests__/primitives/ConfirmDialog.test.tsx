import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from '../../components/primitives/ConfirmDialog';

function setup(props: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  const result = render(
    <ConfirmDialog
      open={true}
      onConfirm={onConfirm}
      onCancel={onCancel}
      message="This cannot be undone."
      {...props}
    />,
  );
  return { onConfirm, onCancel, container: result.container };
}

describe('ConfirmDialog', () => {
  it('renders nothing when open=false', () => {
    setup({ open: false });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders dialog when open=true', () => {
    setup();
    expect(screen.getByRole('dialog')).toBeDefined();
  });

  it('renders the message text', () => {
    setup({ message: 'Are you absolutely sure?' });
    expect(screen.getByText('Are you absolutely sure?')).toBeDefined();
  });

  it('renders default title', () => {
    setup();
    expect(screen.getByText('Are you sure?')).toBeDefined();
  });

  it('renders custom title', () => {
    setup({ title: 'Delete project?' });
    expect(screen.getByText('Delete project?')).toBeDefined();
  });

  it('calls onConfirm when confirm button clicked', async () => {
    const { onConfirm } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('calls onCancel when cancel button clicked', async () => {
    const { onCancel } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('calls onCancel when Escape pressed', () => {
    const { onCancel } = setup();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('does NOT call onCancel when backdrop clicked (closeOnBackdrop=false)', () => {
    const { onCancel } = setup();
    const backdrop = document.querySelector('[aria-hidden="true"]') as HTMLElement;
    fireEvent.click(backdrop);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('renders danger variant on confirm button when destructive=true', () => {
    setup({ destructive: true });
    const confirmBtn = screen.getByRole('button', { name: 'Confirm' });
    expect(confirmBtn.className).toContain('nd-accent-error');
  });

  it('renders primary variant on confirm button when destructive=false', () => {
    setup({ destructive: false });
    const confirmBtn = screen.getByRole('button', { name: 'Confirm' });
    expect(confirmBtn.className).toContain('nd-accent-primary');
  });

  it('renders alert triangle icon when destructive=true', () => {
    const { container } = setup({ destructive: true });
    // AlertTriangle SVG is inside a span with text-nd-accent-error class
    expect(container.querySelector('span.text-nd-accent-error')).not.toBeNull();
  });

  it('does not render danger icon span when destructive=false', () => {
    const { container } = setup({ destructive: false });
    expect(container.querySelector('span.text-nd-danger')).toBeNull();
  });

  it('uses custom confirmLabel and cancelLabel', () => {
    setup({ confirmLabel: 'Delete it', cancelLabel: 'Never mind' });
    expect(screen.getByRole('button', { name: 'Delete it' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Never mind' })).toBeDefined();
  });
});
