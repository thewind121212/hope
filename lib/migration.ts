import { getBookmarks } from '@voc/lib/storage';
import { hasSeenOnboarding, markOnboardingSeen } from '@voc/lib/onboarding';

/**
 * Run onboarding migration logic
 *
 * This handles existing users who may have bookmarks but haven't seen onboarding
 * (because the onboarding feature didn't exist when they first used the app).
 *
 * Rules:
 * - If user has bookmarks but no onboarding flag → mark as seen (they're an existing user)
 * - If user has no bookmarks and no flag → they're truly new, show onboarding
 * - If flag already exists → nothing to do
 */
export function runOnboardingMigration(): void {
  if (typeof window === 'undefined') return;

  // If flag is already set, nothing to migrate
  if (hasSeenOnboarding()) {
    return;
  }

  try {
    // Check if user has bookmarks
    const bookmarks = getBookmarks();

    if (bookmarks.length > 0) {
      // User has bookmarks but no flag - they're an existing user
      // Mark onboarding as seen so they don't get the first-run experience
      markOnboardingSeen();
    }
    // If no bookmarks and no flag - user is truly new, let them see onboarding
  } catch {
    // If we can't read bookmarks, assume migration not needed
    // (likely server-side or storage error)
    markOnboardingSeen();
  }
}

/**
 * Migration result for logging/debugging
 */
export type MigrationResult = {
  hasBookmarks: boolean;
  hadOnboardingFlag: boolean;
  action: 'none' | 'marked_seen' | 'skipped';
};

/**
 * Run migration and return result for debugging
 */
export function runOnboardingMigrationWithResult(): MigrationResult {
  if (typeof window === 'undefined') {
    return {
      hasBookmarks: false,
      hadOnboardingFlag: true,
      action: 'none',
    };
  }

  const hadFlag = hasSeenOnboarding();
  const bookmarks = getBookmarks();
  const hasBookmarks = bookmarks.length > 0;

  if (hadFlag) {
    return {
      hasBookmarks,
      hadOnboardingFlag: true,
      action: 'none',
    };
  }

  if (hasBookmarks) {
    markOnboardingSeen();
    return {
      hasBookmarks: true,
      hadOnboardingFlag: false,
      action: 'marked_seen',
    };
  }

  return {
    hasBookmarks: false,
    hadOnboardingFlag: false,
    action: 'skipped',
  };
}
