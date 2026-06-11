import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '../../components/primitives/Badge';

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeDefined();
  });

  it('uses neutral tone by default', () => {
    const { container } = render(<Badge>Neutral</Badge>);
    const span = container.querySelector('span');
    expect(span?.className).toContain('text-nd-text');
  });

  it('applies danger tone classes', () => {
    const { container } = render(<Badge tone="danger">Error</Badge>);
    const span = container.querySelector('span');
    expect(span?.className).toContain('text-nd-danger');
  });

  it('applies success tone classes', () => {
    const { container } = render(<Badge tone="success">OK</Badge>);
    const span = container.querySelector('span');
    expect(span?.className).toContain('text-nd-success');
  });

  it('applies accent tone classes', () => {
    const { container } = render(<Badge tone="accent">Active</Badge>);
    const span = container.querySelector('span');
    expect(span?.className).toContain('text-nd-accent');
  });

  it('renders dot indicator when dot=true', () => {
    const { container } = render(<Badge dot>With Dot</Badge>);
    // Dot is a child span with h-1.5 class
    const innerSpans = container.querySelectorAll('span span');
    expect(innerSpans.length).toBeGreaterThan(0);
  });

  it('does not render dot when dot=false', () => {
    const { container } = render(<Badge>No Dot</Badge>);
    const innerSpans = container.querySelectorAll('span span');
    expect(innerSpans.length).toBe(0);
  });

  it('applies outline variant classes', () => {
    const { container } = render(<Badge variant="outline" tone="success">Outlined</Badge>);
    const span = container.querySelector('span');
    // Outline variant: no bg class, has border class
    expect(span?.className).toContain('border-nd-success');
    expect(span?.className).not.toContain('bg-nd-success');
  });

  it('sm size applies text-2xs', () => {
    const { container } = render(<Badge size="sm">Small</Badge>);
    const span = container.querySelector('span');
    expect(span?.className).toContain('text-2xs');
  });

  it('md size applies text-xs', () => {
    const { container } = render(<Badge size="md">Medium</Badge>);
    const span = container.querySelector('span');
    expect(span?.className).toContain('text-xs');
  });
});
