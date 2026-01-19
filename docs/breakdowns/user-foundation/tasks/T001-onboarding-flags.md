# T001: Create localStorage Flag Utilities

**ID**: T001
**Phase**: Phase 1 - Foundation (BE)
**Status**: pending
**Dependencies**: None

---

## Action
Create utility functions for managing onboarding state in localStorage.

---

## Business Summary
Establish a reliable pattern for tracking whether a user has completed onboarding, ensuring the onboarding panel only shows once.

---

## Logic
Create functions to check, set, and clear the onboarding completion flag in localStorage. These utilities will be used throughout the app to determine whether to show the OnboardingPanel.

---

## Technical Logic

### Requirements
1. **Flag Key**: Use a consistent localStorage key (e.g., `bookmark-vault-onboarding-seen`)
2. **Functions**:
   - `hasSeenOnboarding()`: boolean - Check if flag is set
   - `markOnboardingSeen()`: void - Set the flag to true
   - `clearOnboardingFlag()`: void - Remove the flag (for testing/debug)
3. **Safety**: Handle cases where localStorage is unavailable (private browsing, SSR)
4. **Client-only**: Ensure functions only run in browser environment

### Implementation
```typescript
// lib/onboarding.ts

const ONBOARDING_KEY = 'bookmark-vault-onboarding-seen';

export function hasSeenOnboarding(): boolean {
  if (typeof window === 'undefined') return true; // SSR safety
  try {
    return localStorage.getItem(ONBOARDING_KEY) === 'true';
  } catch {
    return true; // Private browsing fallback
  }
}

export function markOnboardingSeen(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ONBOARDING_KEY, 'true');
  } catch {
    // Silently fail in private browsing
  }
}

export function clearOnboardingFlag(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(ONBOARDING_KEY);
  } catch {
    // Silently fail
  }
}
```

---

## Testing

### Unit Tests (`lib/__tests__/onboarding.test.ts`)
- Mock localStorage with class spy or jest mock
- Test `hasSeenOnboarding()` returns false initially
- Test `markOnboardingSeen()` sets flag
- Test `hasSeenOnboarding()` returns true after marking
- Test `clearOnboardingFlag()` removes flag
- Test graceful handling when localStorage unavailable

---

## Files
- **Create**: `lib/onboarding.ts`
- **Create**: `lib/__tests__/onboarding.test.ts`

---

## Patterns
- Reference: `lib/storage.ts` for existing localStorage patterns
