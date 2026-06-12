/**
 * Tests for the semantic design-token layer.
 */
import { describe, it, expect } from 'vitest';
import {
  resolveSemanticTokens,
  semanticTokensToCssVars,
  token,
} from '@/shared/theme/designTokens';
import { getDefaultTokens } from '@/shared/theme/themePresets';

describe('resolveSemanticTokens', () => {
  it('produces all requested semantic color tokens', () => {
    const semantic = resolveSemanticTokens(getDefaultTokens());

    expect(semantic.color.surface.base).toBeDefined();
    expect(semantic.color.surface.raised).toBeDefined();
    expect(semantic.color.surface.glass).toBeDefined();
    expect(semantic.color.surface.overlay).toBeDefined();
    expect(semantic.color.surface.modal).toBeDefined();
    expect(semantic.color.surface.danger).toBeDefined();

    expect(semantic.color.border.subtle).toBeDefined();
    expect(semantic.color.border.strong).toBeDefined();
    expect(semantic.color.border.focus).toBeDefined();

    expect(semantic.color.text.primary).toBeDefined();
    expect(semantic.color.text.secondary).toBeDefined();
    expect(semantic.color.text.muted).toBeDefined();
    expect(semantic.color.text.disabled).toBeDefined();

    expect(semantic.color.accent.primary).toBeDefined();
    expect(semantic.color.accent.secondary).toBeDefined();
    expect(semantic.color.accent.success).toBeDefined();
    expect(semantic.color.accent.warning).toBeDefined();
    expect(semantic.color.accent.error).toBeDefined();
    expect(semantic.color.accent.info).toBeDefined();
  });

  it('maps accent.error to the theme error state', () => {
    const semantic = resolveSemanticTokens(getDefaultTokens());
    expect(semantic.color.accent.error).toBe(getDefaultTokens().color.state.error);
    expect(semantic.color.surface.danger).toBe(getDefaultTokens().color.state.error);
  });

  it('produces typography, spacing, radius, elevation and motion tokens', () => {
    const semantic = resolveSemanticTokens(getDefaultTokens());

    expect(semantic.typography.family.display).toBeDefined();
    expect(semantic.typography.size.body).toBeDefined();
    expect(semantic.typography.weight.bold).toBeGreaterThan(0);

    expect(semantic.spacing.touchTarget).toBe('40px');
    expect(semantic.radius.pill).toBe('9999px');

    expect(semantic.elevation.flat).toBe('none');
    expect(semantic.elevation.modal).toBeDefined();

    expect(semantic.motion.fast).toBeDefined();
    expect(semantic.motion.normal).toBeDefined();
    expect(semantic.motion.slow).toBeDefined();
  });

  it('respects reduced motion option', () => {
    const semantic = resolveSemanticTokens(getDefaultTokens(), { reducedMotion: true });
    expect(semantic.motion.reducedMotion).toBe(true);
  });
});

describe('semanticTokensToCssVars', () => {
  it('emits a CSS variable for every semantic token', () => {
    const semantic = resolveSemanticTokens(getDefaultTokens());
    const vars = semanticTokensToCssVars(semantic);

    expect(vars['--nd-surface-base']).toBe(semantic.color.surface.base);
    expect(vars['--nd-text-primary']).toBe(semantic.color.text.primary);
    expect(vars['--nd-accent-error']).toBe(semantic.color.accent.error);
    expect(vars['--nd-spacing-touch-target']).toBe('40px');
    expect(vars['--nd-radius-modal']).toBe(semantic.radius.modal);
    expect(vars['--nd-elevation-modal']).toBe(semantic.elevation.modal);
    expect(vars['--nd-motion-normal']).toBe(semantic.motion.normal);
  });
});

describe('token helper', () => {
  it('returns a CSS var() reference', () => {
    expect(token('accent-primary')).toBe('var(--nd-accent-primary)');
    expect(token('surface-base')).toBe('var(--nd-surface-base)');
  });
});
