/**
 * @jest-environment jsdom
 */
import {
  hasSeenOnboarding,
  markOnboardingSeen,
  clearOnboardingFlag,
  isFirstLaunch,
} from '@voc/lib/onboarding';

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

describe('onboarding', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe('hasSeenOnboarding', () => {
    it('returns false when flag is not set', () => {
      expect(hasSeenOnboarding()).toBe(false);
    });

    it('returns true when flag is set to true', () => {
      localStorageMock.setItem('bookmark-vault-onboarding-seen', 'true');
      expect(hasSeenOnboarding()).toBe(true);
    });

    it('returns false when flag is set to other value', () => {
      localStorageMock.setItem('bookmark-vault-onboarding-seen', 'false');
      expect(hasSeenOnboarding()).toBe(false);
    });

    it('returns true when localStorage throws error', () => {
      const originalGetItem = localStorageMock.getItem;
      localStorageMock.getItem = () => {
        throw new Error('Storage unavailable');
      };

      expect(hasSeenOnboarding()).toBe(true);

      localStorageMock.getItem = originalGetItem;
    });
  });

  describe('markOnboardingSeen', () => {
    it('sets the flag in localStorage', () => {
      markOnboardingSeen();
      expect(localStorageMock.getItem('bookmark-vault-onboarding-seen')).toBe('true');
    });

    it('does not throw when localStorage is unavailable', () => {
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = () => {
        throw new Error('Storage unavailable');
      };

      expect(() => markOnboardingSeen()).not.toThrow();

      localStorageMock.setItem = originalSetItem;
    });
  });

  describe('clearOnboardingFlag', () => {
    it('removes the flag from localStorage', () => {
      localStorageMock.setItem('bookmark-vault-onboarding-seen', 'true');
      clearOnboardingFlag();
      expect(localStorageMock.getItem('bookmark-vault-onboarding-seen')).toBeNull();
    });

    it('does not throw when localStorage is unavailable', () => {
      const originalRemoveItem = localStorageMock.removeItem;
      localStorageMock.removeItem = () => {
        throw new Error('Storage unavailable');
      };

      expect(() => clearOnboardingFlag()).not.toThrow();

      localStorageMock.removeItem = originalRemoveItem;
    });
  });

  describe('isFirstLaunch', () => {
    it('returns false when onboarding flag is set', () => {
      localStorageMock.setItem('bookmark-vault-onboarding-seen', 'true');
      expect(isFirstLaunch()).toBe(false);
    });

    it('returns false when user has bookmarks', () => {
      localStorageMock.setItem('bookmark-vault-bookmarks', JSON.stringify([
        { id: '1', title: 'Test', url: 'https://example.com', tags: [], createdAt: '2024-01-01' },
      ]));
      expect(isFirstLaunch()).toBe(false);
    });

    it('returns true when no flag and no bookmarks', () => {
      expect(isFirstLaunch()).toBe(true);
    });

    it('returns false when localStorage throws error', () => {
      const originalGetItem = localStorageMock.getItem;
      localStorageMock.getItem = () => {
        throw new Error('Storage unavailable');
      };

      expect(isFirstLaunch()).toBe(false);

      localStorageMock.getItem = originalGetItem;
    });
  });
});
