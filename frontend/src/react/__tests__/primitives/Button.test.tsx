import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../../components/primitives/Button';

describe('Button', () => {
  it('renders children as button text', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDefined();
  });

  it('fires onClick handler on click', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click me</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('is disabled when disabled=true', () => {
    render(<Button disabled>Disabled</Button>);
    const btn = screen.getByRole('button');
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it('is disabled and shows spinner when loading=true', () => {
    const { container } = render(<Button loading>Loading</Button>);
    const btn = screen.getByRole('button');
    expect((btn as HTMLButtonElement).disabled).toBe(true);
    expect(btn.getAttribute('aria-busy')).toBe('true');
    expect(container.querySelector('svg')).toBeDefined();
  });

  it('does not fire onClick while loading', async () => {
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>Submit</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('applies primary variant classes', () => {
    const { container } = render(<Button variant="primary">Primary</Button>);
    expect(container.querySelector('button')?.className).toContain('text-nd-accent-primary');
  });

  it('applies danger variant classes', () => {
    const { container } = render(<Button variant="danger">Delete</Button>);
    expect(container.querySelector('button')?.className).toContain('text-nd-accent-error');
  });

  it('applies fullWidth class when fullWidth=true', () => {
    const { container } = render(<Button fullWidth>Full</Button>);
    expect(container.querySelector('button')?.className).toContain('w-full');
  });

  it('sm size applies h-8 class', () => {
    const { container } = render(<Button size="sm">Small</Button>);
    expect(container.querySelector('button')?.className).toContain('h-8');
  });

  it('lg size applies h-11 class', () => {
    const { container } = render(<Button size="lg">Large</Button>);
    expect(container.querySelector('button')?.className).toContain('h-11');
  });

  it('passes through arbitrary HTML button attributes', () => {
    render(<Button type="submit" data-testid="submit-btn">Submit</Button>);
    const btn = screen.getByTestId('submit-btn');
    expect(btn.getAttribute('type')).toBe('submit');
  });

  it('forwards ref to underlying button element', () => {
    let ref: HTMLButtonElement | null = null;
    render(<Button ref={(el) => { ref = el; }}>Ref</Button>);
    expect(ref).not.toBeNull();
    expect((ref as HTMLButtonElement | null)?.tagName).toBe('BUTTON');
  });
});
