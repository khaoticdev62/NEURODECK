import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createDefaultOnboardingProgress,
  loadOnboardingProgress,
  saveOnboardingProgress,
  ONBOARDING_PROGRESS_KEY,
} from '../../onboarding/OnboardingProgressStore';

const mockStoreGet = vi.fn();
const mockStoreSet = vi.fn();

vi.mock('../../services/bridgeAdapter', () => ({
  neurodeckApi: {
    store: {
      get: (key: string) => mockStoreGet(key),
      set: (key: string, value: unknown) => mockStoreSet(key, value),
    },
  },
}));

describe('OnboardingProgressStore', () => {
  beforeEach(() => vi.clearAllMocks());

  it('createDefaultOnboardingProgress returns valid baseline', () => {
    const progress = createDefaultOnboardingProgress();
    expect(progress.userId).toBe('local');
    expect(Array.isArray(progress.completedStepIds)).toBe(true);
    expect(Array.isArray(progress.skippedStepIds)).toBe(true);
    expect(Array.isArray(progress.dismissedFeatureIds)).toBe(true);
    expect(progress.explanationMode).toBe('jpe');
    expect(['full', 'reduced']).toContain(progress.motionMode);
  });

  it('loadOnboardingProgress returns defaults when store is empty', async () => {
    mockStoreGet.mockResolvedValue(null);
    const progress = await loadOnboardingProgress();
    expect(progress.userId).toBe('local');
    expect(progress.completedStepIds).toEqual([]);
  });

  it('loadOnboardingProgress normalizes partial stored data', async () => {
    mockStoreGet.mockResolvedValue({ completedStepIds: ['workspace.overview'], explanationMode: 'technical' });
    const progress = await loadOnboardingProgress();
    expect(progress.completedStepIds).toEqual(['workspace.overview']);
    expect(progress.explanationMode).toBe('technical');
    expect(Array.isArray(progress.skippedStepIds)).toBe(true);
  });

  it('loadOnboardingProgress falls back to defaults on store error', async () => {
    mockStoreGet.mockRejectedValue(new Error('store unavailable'));
    const progress = await loadOnboardingProgress();
    expect(progress.userId).toBe('local');
    expect(progress.completedStepIds).toEqual([]);
  });

  it('saveOnboardingProgress calls store.set with the correct key', async () => {
    mockStoreSet.mockResolvedValue(undefined);
    const progress = createDefaultOnboardingProgress();
    await saveOnboardingProgress(progress);
    expect(mockStoreSet).toHaveBeenCalledWith(ONBOARDING_PROGRESS_KEY, expect.objectContaining({ userId: 'local' }));
  });

  it('saveOnboardingProgress updates lastUpdatedAt', async () => {
    mockStoreSet.mockResolvedValue(undefined);
    const progress = { ...createDefaultOnboardingProgress(), lastUpdatedAt: '2000-01-01T00:00:00.000Z' };
    await saveOnboardingProgress(progress);
    const saved = mockStoreSet.mock.calls[0][1] as { lastUpdatedAt: string };
    expect(saved.lastUpdatedAt).not.toBe('2000-01-01T00:00:00.000Z');
  });

  it('loadOnboardingProgress uses the correct store key', async () => {
    mockStoreGet.mockResolvedValue(null);
    await loadOnboardingProgress();
    expect(mockStoreGet).toHaveBeenCalledWith(ONBOARDING_PROGRESS_KEY);
  });
});
