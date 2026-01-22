const ONBOARDING_KEY = 'bookmark-vault-onboarding-seen';

/**
 * Check if the user has seen the onboarding
 * Returns true if onboarding was seen, false otherwise
 * Defaults to true on server-side to prevent hydration mismatch
 */
export function hasSeenOnboarding(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(ONBOARDING_KEY) === 'true';
  } catch {
    // localStorage unavailable (private browsing, storage quota, etc.)
    return true;
  }
}

/**
 * Mark onboarding as seen
 * Persists across sessions
 */
export function markOnboardingSeen(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ONBOARDING_KEY, 'true');
  } catch {
    // Silently fail in private browsing
  }
}

/**
 * Clear the onboarding flag
 * Useful for testing/demo purposes
 */
export function clearOnboardingFlag(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(ONBOARDING_KEY);
  } catch {
    // Silently fail
  }
}

/**
 * Check if this is the first launch of the app
 * First launch = no bookmarks and no onboarding flag
 */
export function isFirstLaunch(): boolean {
  if (typeof window === 'undefined') return false;
  if (hasSeenOnboarding()) return false;

  // Check if user has any bookmarks
  try {
    const bookmarksKey = 'bookmark-vault-bookmarks';
    const bookmarksData = localStorage.getItem(bookmarksKey);
    if (bookmarksData) {
      // User has bookmarks but no flag - this is an existing user
      return false;
    }
  } catch {
    return false;
  }

  return true;
}
