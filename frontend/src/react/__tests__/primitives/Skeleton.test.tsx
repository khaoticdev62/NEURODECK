import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Skeleton } from '../../components/primitives/Skeleton';

describe('Skeleton', () => {
  it('renders one div by default', () => {
    const { container } = render(<Skeleton />);
    expect(container.querySelectorAll('div').length).toBe(1);
  });

  it('renders count=3 divs', () => {
    const { container } = render(<Skeleton count={3} />);
    expect(container.querySelectorAll('div').length).toBe(3);
  });

  it('applies custom className to each skeleton div', () => {
    const { container } = render(<Skeleton count={2} className="h-4 w-full" />);
    container.querySelectorAll('div').forEach((el) => {
      expect(el.className).toContain('h-4 w-full');
    });
  });

  it('always includes animate-pulse class', () => {
    const { container } = render(<Skeleton />);
    expect(container.querySelector('div')?.className).toContain('animate-pulse');
  });

  it('applies staggered animation delays across multiple items', () => {
    const { container } = render(<Skeleton count={3} delay={0} />);
    const divs = container.querySelectorAll('div');
    expect((divs[0] as HTMLElement).style.animationDelay).toBe('0ms');
    expect((divs[1] as HTMLElement).style.animationDelay).toBe('80ms');
    expect((divs[2] as HTMLElement).style.animationDelay).toBe('160ms');
  });

  it('applies base delay offset', () => {
    const { container } = render(<Skeleton count={2} delay={100} />);
    const divs = container.querySelectorAll('div');
    expect((divs[0] as HTMLElement).style.animationDelay).toBe('100ms');
    expect((divs[1] as HTMLElement).style.animationDelay).toBe('180ms');
  });
});
