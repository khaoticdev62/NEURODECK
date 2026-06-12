import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Settings } from 'lucide-react';
import { FormSection, FormRow } from '../../components/primitives/FormSection';

describe('FormSection', () => {
  it('renders children without a fieldset when no title/icon/description', () => {
    const { container } = render(
      <FormSection>
        <input type="text" />
      </FormSection>
    );
    expect(container.querySelector('fieldset')).toBeNull();
    expect(container.querySelector('div')).toBeDefined();
  });

  it('renders a fieldset+legend when title is provided', () => {
    const { container } = render(
      <FormSection title="Account">
        <span>content</span>
      </FormSection>
    );
    expect(container.querySelector('fieldset')).toBeDefined();
    expect(container.querySelector('legend')).toBeDefined();
    expect(screen.getByText('Account')).toBeDefined();
  });

  it('renders description inside legend', () => {
    render(
      <FormSection title="Notifications" description="Configure alerts">
        <span />
      </FormSection>
    );
    expect(screen.getByText('Configure alerts')).toBeDefined();
  });

  it('renders icon as aria-hidden when provided', () => {
    const { container } = render(
      <FormSection title="Security" icon={Settings}>
        <span />
      </FormSection>
    );
    const svgEl = container.querySelector('svg');
    expect(svgEl).toBeDefined();
    expect(svgEl?.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders children content', () => {
    render(
      <FormSection title="General">
        <button type="button">Save</button>
      </FormSection>
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeDefined();
  });
});

describe('FormRow', () => {
  it('renders label and children', () => {
    render(
      <FormRow label="Username" htmlFor="username-input">
        <input id="username-input" type="text" />
      </FormRow>
    );
    expect(screen.getByText('Username')).toBeDefined();
    expect(screen.getByRole('textbox')).toBeDefined();
  });

  it('associates label with htmlFor', () => {
    render(
      <FormRow label="Email" htmlFor="email-field">
        <input id="email-field" type="email" />
      </FormRow>
    );
    const label = screen.getByText('Email').closest('label');
    expect(label?.getAttribute('for')).toBe('email-field');
  });

  it('renders description when provided', () => {
    render(
      <FormRow label="API Key" description="Keep this secret">
        <input type="password" aria-label="API key value" />
      </FormRow>
    );
    expect(screen.getByText('Keep this secret')).toBeDefined();
  });

  it('shows required marker when required=true', () => {
    const { container } = render(
      <FormRow label="Required Field" required>
        <input type="text" aria-label="Required field input" />
      </FormRow>
    );
    const star = container.querySelector('[aria-hidden="true"]');
    expect(star?.textContent).toBe('*');
  });
});
