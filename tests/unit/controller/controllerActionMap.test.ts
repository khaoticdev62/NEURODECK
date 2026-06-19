/**
 * Unit tests — controller action registry
 * Verifies that all IDE-specific actions are registered and
 * that the Steam Deck default profile has correct bindings.
 */
import { describe, it, expect } from 'vitest';
import {
  ActionId,
  defaultActions,
  defaultSteamDeckProfile,
  ActionRegistry,
} from '../../../src/renderer/utils/controller/action-registry';

describe('ActionId enum', () => {
  it('contains core navigation actions', () => {
    expect(ActionId.NAV_UP).toBe('NAV_UP');
    expect(ActionId.NAV_DOWN).toBe('NAV_DOWN');
    expect(ActionId.NAV_LEFT).toBe('NAV_LEFT');
    expect(ActionId.NAV_RIGHT).toBe('NAV_RIGHT');
  });

  it('contains ACCEPT and BACK', () => {
    expect(ActionId.ACCEPT).toBeDefined();
    expect(ActionId.BACK).toBeDefined();
  });

  it('contains prompt actions', () => {
    expect(ActionId.ACCEPT_SUGGESTION).toBeDefined();
    expect(ActionId.EXECUTE_PROMPT).toBeDefined();
    expect(ActionId.SAVE_PROMPT).toBeDefined();
    expect(ActionId.COMPLETE_PROMPT).toBeDefined();
    expect(ActionId.REGENERATE).toBeDefined();
  });

  it('contains system actions', () => {
    expect(ActionId.OPEN_SETTINGS).toBeDefined();
    expect(ActionId.OPEN_COMMAND_PALETTE).toBeDefined();
    expect(ActionId.OPEN_PROMPT_LIBRARY).toBeDefined();
    expect(ActionId.OPEN_AGENT_WHEEL).toBeDefined();
    expect(ActionId.OPEN_SNIPPET_VAULT).toBeDefined();
  });

  it('contains macro actions', () => {
    expect(ActionId.START_MACRO_RECORDING).toBeDefined();
    expect(ActionId.STOP_MACRO_RECORDING).toBeDefined();
  });
});

describe('defaultActions array', () => {
  it('is non-empty', () => {
    expect(defaultActions.length).toBeGreaterThan(0);
  });

  it('every action has a non-empty id', () => {
    for (const action of defaultActions) {
      expect(typeof action.id).toBe('string');
      expect(action.id.length).toBeGreaterThan(0);
    }
  });

  it('every action has a title', () => {
    for (const action of defaultActions) {
      expect(typeof action.title).toBe('string');
      expect(action.title.length).toBeGreaterThan(0);
    }
  });

  it('every action has a category', () => {
    const validCategories = ['navigation', 'prompt', 'command', 'macro', 'agent', 'system', 'ide'];
    for (const action of defaultActions) {
      expect(validCategories).toContain(action.category);
    }
  });
});

describe('ActionRegistry class', () => {
  it('registers and retrieves an action', () => {
    const registry = new ActionRegistry();
    registry.register({ id: 'TEST_ACTION', title: 'Test', category: 'system' });
    const action = registry.get('TEST_ACTION');
    expect(action).toBeDefined();
    expect(action?.title).toBe('Test');
  });

  it('list() returns all registered actions', () => {
    const registry = new ActionRegistry();
    registry.register({ id: 'A1', title: 'A1', category: 'navigation' });
    registry.register({ id: 'A2', title: 'A2', category: 'prompt' });
    expect(registry.list().length).toBe(2);
  });

  it('listByCategory filters correctly', () => {
    const registry = new ActionRegistry();
    registry.register({ id: 'N1', title: 'Nav1', category: 'navigation' });
    registry.register({ id: 'P1', title: 'Prompt1', category: 'prompt' });
    const navActions = registry.listByCategory('navigation');
    expect(navActions.length).toBe(1);
    expect(navActions[0].id).toBe('N1');
  });

  it('overwriting the same id replaces the action', () => {
    const registry = new ActionRegistry();
    registry.register({ id: 'DUP', title: 'First', category: 'system' });
    registry.register({ id: 'DUP', title: 'Second', category: 'navigation' });
    expect(registry.get('DUP')?.title).toBe('Second');
    expect(registry.list().length).toBe(1);
  });
});

describe('defaultSteamDeckProfile', () => {
  it('has id and name', () => {
    expect(typeof defaultSteamDeckProfile.id).toBe('string');
    expect(typeof defaultSteamDeckProfile.name).toBe('string');
  });

  it('has bindings object', () => {
    expect(typeof defaultSteamDeckProfile.bindings).toBe('object');
    expect(Object.keys(defaultSteamDeckProfile.bindings).length).toBeGreaterThan(0);
  });

  it('DPad directions are bound', () => {
    const { bindings } = defaultSteamDeckProfile;
    expect((bindings as Record<string, string>)['DPadUp.tap']).toBeDefined();
    expect((bindings as Record<string, string>)['DPadDown.tap']).toBeDefined();
    expect((bindings as Record<string, string>)['DPadLeft.tap']).toBeDefined();
    expect((bindings as Record<string, string>)['DPadRight.tap']).toBeDefined();
  });

  it('face buttons are bound', () => {
    const bindings = defaultSteamDeckProfile.bindings as Record<string, string>;
    expect(bindings['A.tap']).toBeDefined();
    expect(bindings['B.tap']).toBeDefined();
  });

  it('shoulder buttons are bound', () => {
    const bindings = defaultSteamDeckProfile.bindings as Record<string, string>;
    expect(bindings['L4.tap']).toBeDefined();
    expect(bindings['R4.tap']).toBeDefined();
    expect(bindings['L5.tap']).toBeDefined();
    expect(bindings['R5.tap']).toBeDefined();
  });

  it('chord bindings are present', () => {
    const bindings = defaultSteamDeckProfile.bindings as Record<string, string>;
    expect(bindings['L4+R4.chord']).toBeDefined();
    expect(bindings['L5+R5.chord']).toBeDefined();
  });

  it('no binding points to an undefined ActionId', () => {
    const validActionIds = new Set(Object.values(ActionId));
    const bindings = defaultSteamDeckProfile.bindings as Record<string, string>;
    for (const actionId of Object.values(bindings)) {
      // All bound actions must be in the ActionId enum
      expect(validActionIds.has(actionId as ActionId)).toBe(true);
    }
  });
});
