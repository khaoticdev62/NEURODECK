import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from '../../components/primitives/Select';

const OPTIONS = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
  { value: 'c', label: 'Option C', disabled: true },
];

describe('Select', () => {
  it('renders a combobox', () => {
    render(<Select options={OPTIONS} />);
    expect(screen.getByRole('combobox')).toBeDefined();
  });

  it('renders all options', () => {
    render(<Select options={OPTIONS} />);
    expect(screen.getByRole('option', { name: 'Option A' })).toBeDefined();
    expect(screen.getByRole('option', { name: 'Option B' })).toBeDefined();
    expect(screen.getByRole('option', { name: 'Option C' })).toBeDefined();
  });

  it('renders disabled option', () => {
    render(<Select options={OPTIONS} />);
    const opt = screen.getByRole('option', { name: 'Option C' }) as HTMLOptionElement;
    expect(opt.disabled).toBe(true);
  });

  it('renders placeholder as first disabled option', () => {
    render(<Select options={OPTIONS} placeholder="Select one…" />);
    const placeholder = screen.getByRole('option', { name: 'Select one…' }) as HTMLOptionElement;
    expect(placeholder.disabled).toBe(true);
  });

  it('renders label and associates it via htmlFor', () => {
    render(<Select options={OPTIONS} label="Choose theme" />);
    expect(screen.getByLabelText('Choose theme')).toBeDefined();
  });

  it('derives id from label when id not provided', () => {
    render(<Select options={OPTIONS} label="My Select" />);
    const select = screen.getByLabelText('My Select') as HTMLSelectElement;
    expect(select.id).toBe('my-select');
  });

  it('uses explicit id', () => {
    render(<Select options={OPTIONS} label="Theme" id="theme-picker" />);
    const select = screen.getByLabelText('Theme') as HTMLSelectElement;
    expect(select.id).toBe('theme-picker');
  });

  it('renders error with role="alert"', () => {
    render(<Select options={OPTIONS} label="Lang" error="Required" />);
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('Required')).toBeDefined();
  });

  it('sets aria-invalid=true on error', () => {
    render(<Select options={OPTIONS} label="Lang" error="Required" />);
    const select = screen.getByLabelText('Lang') as HTMLSelectElement;
    expect(select.getAttribute('aria-invalid')).toBe('true');
  });

  it('links select to error message via aria-describedby', () => {
    render(<Select options={OPTIONS} label="Color" error="Pick one" />);
    const select = screen.getByLabelText('Color') as HTMLSelectElement;
    expect(select.getAttribute('aria-describedby')).toBe('color-error');
  });

  it('renders hint when no error', () => {
    render(<Select options={OPTIONS} label="Size" hint="Pick your size" />);
    expect(screen.getByText('Pick your size')).toBeDefined();
  });

  it('hides hint when error is shown', () => {
    render(<Select options={OPTIONS} label="Size" error="Required" hint="Pick your size" />);
    expect(screen.queryByText('Pick your size')).toBeNull();
  });

  it('renders required asterisk', () => {
    render(<Select options={OPTIONS} label="Category" required />);
    const label = screen.getByText('Category').closest('label');
    expect(label?.textContent).toContain('*');
  });

  it('calls onChange when selection changes', async () => {
    const onChange = vi.fn();
    render(<Select options={OPTIONS} label="Opt" onChange={onChange} />);
    await userEvent.selectOptions(screen.getByLabelText('Opt'), 'b');
    expect(onChange).toHaveBeenCalled();
  });

  it('is disabled when disabled=true', () => {
    render(<Select options={OPTIONS} label="Field" disabled />);
    expect((screen.getByLabelText('Field') as HTMLSelectElement).disabled).toBe(true);
  });

  it('forwards ref to the select element', () => {
    let ref: HTMLSelectElement | null = null;
    render(<Select options={OPTIONS} ref={(el) => { ref = el; }} />);
    expect(ref).not.toBeNull();
    expect((ref as HTMLSelectElement | null)?.tagName).toBe('SELECT');
  });
});
