import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusChip } from '../../components/primitives/StatusChip';
import { CheckCircle2 } from 'lucide-react';

describe('StatusChip', () => {
  it('renders children', () => {
    render(<StatusChip>Ready</StatusChip>);
    expect(screen.getByText('Ready')).toBeDefined();
  });

  it('renders a status dot by default', () => {
    const { container } = render(<StatusChip>Ready</StatusChip>);
    expect(container.querySelector('span[aria-hidden="true"]')).toBeDefined();
  });

  it('renders an icon when provided instead of a dot', () => {
    const { container } = render(<StatusChip icon={CheckCircle2}>Done</StatusChip>);
    expect(container.querySelector('svg')).toBeDefined();
  });

  it.each(['info', 'success', 'warning', 'error'] as const)(
    'applies tone classes for %s',
    (tone) => {
      const { container } = render(<StatusChip tone={tone}>Status</StatusChip>);
      expect(container.querySelector('span')?.className).toContain(`text-nd-accent-${tone}`);
    },
  );

  it('applies md size classes by default', () => {
    const { container } = render(<StatusChip>Status</StatusChip>);
    expect(container.querySelector('span')?.className).toContain('h-6');
  });

  it('applies sm size classes', () => {
    const { container } = render(<StatusChip size="sm">Status</StatusChip>);
    expect(container.querySelector('span')?.className).toContain('h-5');
  });

  it('adds pulse animation when pulse=true', () => {
    const { container } = render(<StatusChip pulse>Live</StatusChip>);
    expect(container.querySelector('.animate-pulse')).toBeDefined();
  });
});
