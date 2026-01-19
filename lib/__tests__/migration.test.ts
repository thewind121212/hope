import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  runOnboardingMigration,
  runOnboardingMigrationWithResult,
  type MigrationResult,
} from '../migration';

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
    vi.clearAllMocks();
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

    it('marks flag on storage error', () => {
      const originalGetItem = localStorageMock.getItem;
      localStorageMock.getItem = () => {
        throw new Error('Storage unavailable');
      };

      runOnboardingMigration();
      expect(localStorageMock.getItem('bookmark-vault-onboarding-seen')).toBe('true');

      localStorageMock.getItem = originalGetItem;
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
