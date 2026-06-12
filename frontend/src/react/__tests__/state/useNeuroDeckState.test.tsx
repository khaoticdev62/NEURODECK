/**
 * Integration tests for the useNeuroDeckState hook.
 * Tests hydration, persistence debounce, resetLocalState, and selectors.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('../../services/bridgeAdapter', () => ({
  neurodeckApi: {
    store: {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue({ ok: true }),
      reset: vi.fn().mockResolvedValue({ ok: true }),
    },
  },
  listenBridge: vi.fn().mockReturnValue(() => {}),
}));

import { useNeuroDeckState } from '../../state/useNeuroDeckState';
import { neurodeckApi } from '../../services/bridgeAdapter';

const storeMock = neurodeckApi.store as {
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  reset: ReturnType<typeof vi.fn>;
};

// shouldAdvanceTime: true — fake timers still advance at real-time pace,
// so waitFor() polling (via setTimeout) is not blocked, while vi.advanceTimersByTime()
// still lets us trigger the 250ms debounce precisely.
beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.clearAllMocks();
  storeMock.get.mockResolvedValue(null);
  storeMock.set.mockResolvedValue({ ok: true });
  storeMock.reset.mockResolvedValue({ ok: true });
});

afterEach(() => {
  vi.useRealTimers();
});

// ---- hydration ----
describe('useNeuroDeckState — hydration', () => {
  it('starts as not hydrated', () => {
    const { result } = renderHook(() => useNeuroDeckState());
    expect(result.current.state.hydrated).toBe(false);
  });

  it('becomes hydrated after store.get resolves', async () => {
    const { result } = renderHook(() => useNeuroDeckState());
    await waitFor(() => expect(result.current.state.hydrated).toBe(true));
  });

  it('calls store.get once on mount', async () => {
    renderHook(() => useNeuroDeckState());
    await waitFor(() => expect(storeMock.get).toHaveBeenCalledOnce());
  });

  it('applies stored preferences from store.get', async () => {
    storeMock.get.mockResolvedValueOnce({ selectedTheme: 'Hologrid', selectedFont: 'jetbrains' });
    const { result } = renderHook(() => useNeuroDeckState());
    await waitFor(() => expect(result.current.state.hydrated).toBe(true));
    expect(result.current.state.selectedTheme).toBe('Hologrid');
    expect(result.current.state.selectedFont).toBe('jetbrains');
  });

  it('does not restore busyLabel from stored state (sanitised out)', async () => {
    storeMock.get.mockResolvedValueOnce({ busyLabel: 'leftover', selectedTheme: 'Blacksite' });
    const { result } = renderHook(() => useNeuroDeckState());
    await waitFor(() => expect(result.current.state.hydrated).toBe(true));
    expect(result.current.state.busyLabel).toBeNull();
  });

  it('does not restore commandOpen from stored state', async () => {
    storeMock.get.mockResolvedValueOnce({ commandOpen: true });
    const { result } = renderHook(() => useNeuroDeckState());
    await waitFor(() => expect(result.current.state.hydrated).toBe(true));
    expect(result.current.state.commandOpen).toBe(false);
  });

  it('hydrates to defaults when store.get rejects', async () => {
    storeMock.get.mockRejectedValueOnce(new Error('storage unavailable'));
    const { result } = renderHook(() => useNeuroDeckState());
    await waitFor(() => expect(result.current.state.hydrated).toBe(true));
    expect(result.current.state.selectedTheme).toBe('Blacksite');
  });

  it('hydrates to defaults when store.get returns null', async () => {
    storeMock.get.mockResolvedValueOnce(null);
    const { result } = renderHook(() => useNeuroDeckState());
    await waitFor(() => expect(result.current.state.hydrated).toBe(true));
    expect(result.current.state.selectedProvider).toBe('ollama');
    expect(result.current.state.selectedModelId).toBe('');
  });
});

// ---- persistence debounce ----
describe('useNeuroDeckState — persistence', () => {
  it('calls store.set after 250ms debounce following a state change', async () => {
    const { result } = renderHook(() => useNeuroDeckState());
    await waitFor(() => expect(result.current.state.hydrated).toBe(true));

    // Drain the initial post-hydration persist tick
    act(() => { vi.advanceTimersByTime(300); });
    const callsAfterHydrate = storeMock.set.mock.calls.length;

    act(() => {
      result.current.dispatch({ type: 'set-theme', theme: 'Hologrid' });
    });
    act(() => { vi.advanceTimersByTime(249); });
    expect(storeMock.set.mock.calls.length).toBe(callsAfterHydrate);

    act(() => { vi.advanceTimersByTime(1); });
    expect(storeMock.set.mock.calls.length).toBeGreaterThan(callsAfterHydrate);
  });

  it('persists the updated value in the payload', async () => {
    const { result } = renderHook(() => useNeuroDeckState());
    await waitFor(() => expect(result.current.state.hydrated).toBe(true));

    act(() => {
      result.current.dispatch({ type: 'set-theme', theme: 'Night Watch' });
    });
    act(() => { vi.advanceTimersByTime(300); });

    const lastCall = storeMock.set.mock.calls[storeMock.set.mock.calls.length - 1];
    expect(lastCall[1].selectedTheme).toBe('Night Watch');
  });

  it('does NOT call store.set before hydration completes', () => {
    // Don't await — keep in un-hydrated window
    renderHook(() => useNeuroDeckState());
    act(() => { vi.advanceTimersByTime(300); });
    expect(storeMock.set).not.toHaveBeenCalled();
  });

  it('strips transient fields from persisted payload', async () => {
    const { result } = renderHook(() => useNeuroDeckState());
    await waitFor(() => expect(result.current.state.hydrated).toBe(true));

    act(() => {
      result.current.dispatch({ type: 'set-busy', label: 'processing' });
    });
    act(() => { vi.advanceTimersByTime(300); });

    const lastCall = storeMock.set.mock.calls[storeMock.set.mock.calls.length - 1];
    expect(lastCall[1].busyLabel).toBeUndefined();
    expect(lastCall[1].commandOpen).toBeUndefined();
    expect(lastCall[1].hydrated).toBeUndefined();
    expect(lastCall[1].diagnostics).toBeUndefined();
    expect(lastCall[1].lastError).toBeUndefined();
  });

  it('includes a lastSavedAt ISO timestamp in persisted payload', async () => {
    const { result } = renderHook(() => useNeuroDeckState());
    await waitFor(() => expect(result.current.state.hydrated).toBe(true));

    act(() => {
      result.current.dispatch({ type: 'set-persona', persona: 'BMAD' });
    });
    act(() => { vi.advanceTimersByTime(300); });

    const lastCall = storeMock.set.mock.calls[storeMock.set.mock.calls.length - 1];
    expect(typeof lastCall[1].lastSavedAt).toBe('string');
    expect(() => new Date(lastCall[1].lastSavedAt)).not.toThrow();
  });
});

// ---- resetLocalState ----
describe('useNeuroDeckState — resetLocalState', () => {
  it('calls store.reset', async () => {
    const { result } = renderHook(() => useNeuroDeckState());
    await waitFor(() => expect(result.current.state.hydrated).toBe(true));

    await act(async () => {
      await result.current.resetLocalState();
    });
    expect(storeMock.reset).toHaveBeenCalledOnce();
  });

  it('resets state to initial values after user changes', async () => {
    const { result } = renderHook(() => useNeuroDeckState());
    await waitFor(() => expect(result.current.state.hydrated).toBe(true));

    act(() => {
      result.current.dispatch({ type: 'set-theme', theme: 'Broadcast' });
      result.current.dispatch({ type: 'toggle-deck-mode' });
    });
    expect(result.current.state.selectedTheme).toBe('Broadcast');

    await act(async () => {
      await result.current.resetLocalState();
    });

    expect(result.current.state.selectedTheme).toBe('Blacksite');
    expect(result.current.state.deckMode).toBe(false);
  });

  it('leaves state hydrated=true after reset', async () => {
    const { result } = renderHook(() => useNeuroDeckState());
    await waitFor(() => expect(result.current.state.hydrated).toBe(true));

    await act(async () => {
      await result.current.resetLocalState();
    });
    expect(result.current.state.hydrated).toBe(true);
  });
});

// ---- selectors ----
describe('useNeuroDeckState — selectors', () => {
  it('activeAgents counts agents with status=thinking', async () => {
    const { result } = renderHook(() => useNeuroDeckState());
    await waitFor(() => expect(result.current.state.hydrated).toBe(true));

    const expected = result.current.state.agents.filter((a) => a.status === 'thinking').length;
    expect(result.current.selectors.activeAgents).toBe(expected);
  });

  it('readyModels counts models with status ready or indexed', async () => {
    const { result } = renderHook(() => useNeuroDeckState());
    await waitFor(() => expect(result.current.state.hydrated).toBe(true));

    const expected = result.current.state.models.filter(
      (m) => m.status === 'ready' || m.status === 'indexed',
    ).length;
    expect(result.current.selectors.readyModels).toBe(expected);
  });

  it('pinnedMemories counts pinned memories', async () => {
    const { result } = renderHook(() => useNeuroDeckState());
    await waitFor(() => expect(result.current.state.hydrated).toBe(true));

    const expected = result.current.state.memories.filter((m) => m.pinned).length;
    expect(result.current.selectors.pinnedMemories).toBe(expected);
  });

  it('enabledPlugins counts enabled plugins', async () => {
    const { result } = renderHook(() => useNeuroDeckState());
    await waitFor(() => expect(result.current.state.hydrated).toBe(true));

    const expected = result.current.state.plugins.filter((p) => p.status === 'enabled').length;
    expect(result.current.selectors.enabledPlugins).toBe(expected);
  });

  it('messageCount equals messages array length', async () => {
    const { result } = renderHook(() => useNeuroDeckState());
    await waitFor(() => expect(result.current.state.hydrated).toBe(true));

    expect(result.current.selectors.messageCount).toBe(result.current.state.messages.length);
  });

  it('completedRuns is 0 with empty aiRuns', async () => {
    const { result } = renderHook(() => useNeuroDeckState());
    await waitFor(() => expect(result.current.state.hydrated).toBe(true));

    expect(result.current.selectors.completedRuns).toBe(0);
  });

  it('riskCount is 0 with no active project', async () => {
    const { result } = renderHook(() => useNeuroDeckState());
    await waitFor(() => expect(result.current.state.hydrated).toBe(true));

    expect(result.current.selectors.riskCount).toBe(0);
  });

  it('riskCount updates when a project with risks is scanned', async () => {
    const { result } = renderHook(() => useNeuroDeckState());
    await waitFor(() => expect(result.current.state.hydrated).toBe(true));

    act(() => {
      result.current.dispatch({
        type: 'set-project-scan',
        project: { path: '/app', name: 'app', risks: ['dep-vuln', 'open-port'] } as any,
      });
    });
    expect(result.current.selectors.riskCount).toBe(2);
  });

  it('activeAgents increments when an idle agent is toggled', async () => {
    const { result } = renderHook(() => useNeuroDeckState());
    await waitFor(() => expect(result.current.state.hydrated).toBe(true));

    const idleAgent = result.current.state.agents.find((a) => a.status === 'idle');
    if (!idleAgent) return;

    const before = result.current.selectors.activeAgents;
    act(() => {
      result.current.dispatch({ type: 'toggle-agent', id: idleAgent.id });
    });
    expect(result.current.selectors.activeAgents).toBe(before + 1);
  });
});
