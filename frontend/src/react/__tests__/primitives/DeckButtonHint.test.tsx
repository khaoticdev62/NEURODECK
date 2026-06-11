import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DeckButtonHint } from '../../components/primitives/DeckButtonHint';

describe('DeckButtonHint', () => {
  it('renders button label and action label', () => {
    render(<DeckButtonHint button="A" label="Confirm" />);
    expect(screen.getByText('A')).toBeDefined();
    expect(screen.getByText('Confirm')).toBeDefined();
  });

  it('has data-testid="deck-button-hint"', () => {
    render(<DeckButtonHint button="B" label="Back" />);
    expect(screen.getByTestId('deck-button-hint')).toBeDefined();
  });

  it('applies custom className', () => {
    render(<DeckButtonHint button="X" label="Close" className="opacity-50" />);
    expect(screen.getByTestId('deck-button-hint').className).toContain('opacity-50');
  });

  it('renders button text in a bold element', () => {
    const { container } = render(<DeckButtonHint button="L2" label="Menu" />);
    const bold = container.querySelector('b');
    expect(bold?.textContent).toBe('L2');
  });
});
