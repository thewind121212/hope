/**
 * @jest-environment jsdom
 */
import { v4 as uuidv4 } from 'uuid';

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

import {
  runOnboardingMigration,
  runOnboardingMigrationWithResult,
  type MigrationResult,
} from '@voc/lib/migration';
import { __resetCacheForTesting as resetStorageCache } from '@voc/lib/storage';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

describe('migration', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    resetStorageCache();
  });

  afterEach(() => {
    // Restore the localStorage methods to avoid affecting subsequent tests
    localStorageMock.clear();
    resetStorageCache();
  });

  describe('runOnboardingMigration', () => {
    it('does nothing when flag is already set', () => {
      localStorageMock.setItem('bookmark-vault-onboarding-seen', 'true');
      runOnboardingMigration();
      expect(localStorageMock.getItem('bookmark-vault-onboarding-seen')).toBe('true');
    });

    it('marks flag as seen when user has bookmarks but no flag', () => {
      localStorageMock.setItem('bookmark-vault-bookmarks', JSON.stringify({
        version: 1,
        data: [
          { id: '1', title: 'Test', url: 'https://example.com', tags: [], createdAt: '2024-01-01' },
        ],
      }));
      runOnboardingMigration();
      expect(localStorageMock.getItem('bookmark-vault-onboarding-seen')).toBe('true');
    });

    it('does not mark flag when user has no bookmarks and no flag', () => {
      runOnboardingMigration();
      expect(localStorageMock.getItem('bookmark-vault-onboarding-seen')).toBeNull();
    });

    it('returns early when storage error on hasSeenOnboarding check', () => {
      const originalGetItem = localStorageMock.getItem;
      try {
        localStorageMock.getItem = () => {
          throw new Error('Storage unavailable');
        };

        // When storage throws, hasSeenOnboarding() returns true (safe default)
        // So runOnboardingMigration() returns early without marking anything
        runOnboardingMigration();

        // Restore before checking result
        localStorageMock.getItem = originalGetItem;
        // The flag should not be set because migration returns early
        expect(localStorageMock.getItem('bookmark-vault-onboarding-seen')).toBeNull();
      } finally {
        // Always restore, even if assertion fails
        localStorageMock.getItem = originalGetItem;
      }
    });
  });

  describe('runOnboardingMigrationWithResult', () => {
    it('returns none action when flag is already set', () => {
      localStorageMock.setItem('bookmark-vault-onboarding-seen', 'true');
      const result = runOnboardingMigrationWithResult();

      expect(result).toEqual({
        hasBookmarks: false,
        hadOnboardingFlag: true,
        action: 'none',
      } satisfies MigrationResult);
    });

    it('returns marked_seen when user has bookmarks but no flag', () => {
      localStorageMock.setItem('bookmark-vault-bookmarks', JSON.stringify({
        version: 1,
        data: [
          { id: '1', title: 'Test', url: 'https://example.com', tags: [], createdAt: '2024-01-01' },
        ],
      }));
      const result = runOnboardingMigrationWithResult();

      expect(result).toEqual({
        hasBookmarks: true,
        hadOnboardingFlag: false,
        action: 'marked_seen',
      } satisfies MigrationResult);
      expect(localStorageMock.getItem('bookmark-vault-onboarding-seen')).toBe('true');
    });

    it('returns skipped when user has no bookmarks and no flag', () => {
      const result = runOnboardingMigrationWithResult();

      expect(result).toEqual({
        hasBookmarks: false,
        hadOnboardingFlag: false,
        action: 'skipped',
      } satisfies MigrationResult);
      expect(localStorageMock.getItem('bookmark-vault-onboarding-seen')).toBeNull();
    });

    it('returns none action on server-side', () => {
      const originalWindow = global.window;
      // @ts-expect-error - testing server-side behavior
      delete global.window;

      const result = runOnboardingMigrationWithResult();

      expect(result).toEqual({
        hasBookmarks: false,
        hadOnboardingFlag: true,
        action: 'none',
      } satisfies MigrationResult);

      global.window = originalWindow;
    });

    it('returns hasBookmarks true when flag exists and bookmarks exist', () => {
      localStorageMock.setItem('bookmark-vault-onboarding-seen', 'true');
      localStorageMock.setItem('bookmark-vault-bookmarks', JSON.stringify({
        version: 1,
        data: [
          { id: '1', title: 'Test', url: 'https://example.com', tags: [], createdAt: '2024-01-01' },
        ],
      }));
      const result = runOnboardingMigrationWithResult();

      expect(result).toEqual({
        hasBookmarks: true,
        hadOnboardingFlag: true,
        action: 'none',
      } satisfies MigrationResult);
    });
  });
});
