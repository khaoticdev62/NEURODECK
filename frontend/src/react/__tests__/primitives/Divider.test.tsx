import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Divider } from '../../components/primitives/Divider';

describe('Divider', () => {
  it('renders a simple horizontal rule without label', () => {
    const { container } = render(<Divider />);
    const el = container.firstElementChild as HTMLElement;
    expect(el?.className).toContain('h-px');
    expect(el?.className).toContain('bg-nd-text-muted/15');
  });

  it('renders label text when provided', () => {
    render(<Divider label="OR" />);
    expect(screen.getByText('OR')).toBeDefined();
  });

  it('renders two decorative lines alongside the label', () => {
    const { container } = render(<Divider label="OR" />);
    // The flex container wraps two h-px divs and the label span
    const lines = container.querySelectorAll('.h-px');
    expect(lines.length).toBe(2);
  });

  it('applies custom className to the root element', () => {
    const { container } = render(<Divider className="my-4" />);
    expect(container.firstElementChild?.className).toContain('my-4');
  });

  it('applies custom className to the labeled variant', () => {
    const { container } = render(<Divider label="Section" className="my-6" />);
    expect(container.firstElementChild?.className).toContain('my-6');
  });
});
