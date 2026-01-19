# T017: Integrate Onboarding to Main Page

**ID**: T017
**Phase**: Phase 5 - Integration & Polish
**Status**: pending
**Dependencies**: T001, T002, T003, T005

---

## Action
Integrate the OnboardingPanel component into the main application page.

---

## Business Summary
Complete the onboarding feature by ensuring first-time users see the onboarding panel and existing users are not disrupted.

---

## Logic

### Integration Points
1. Run migration logic on app mount (T003)
2. Conditionally render OnboardingPanel
3. Ensure onboarding doesn't block app usage

### Migration Strategy
- If user has existing bookmarks but no onboarding flag → set flag (don't show onboarding)
- If user has no bookmarks and no flag → show onboarding
- If flag exists → never show onboarding

---

## Technical Logic

### Implementation Steps

1. **Add migration call** in `app/page.tsx`:
```tsx
"use client"

import { useEffect } from 'react';
import { runOnboardingMigration } from '@/lib/migration';
import { OnboardingPanel } from '@/components/onboarding/OnboardingPanel';
// ... other imports

export default function HomePage() {
  useEffect(() => {
    runOnboardingMigration();
  }, []);

  return (
    <>
      <OnboardingPanel />
      {/* existing page content */}
    </>
  );
}
```

2. **Ensure OnboardingPanel renders on top**:
- Render OnboardingPanel before main content
- Use z-index to ensure modal appears above everything
- Don't block main content rendering (onboarding is dismissible)

3. **Handle hydration**:
- OnboardingPanel should manage its own visibility state
- Prevent flash of onboarding on refresh (flag check happens before render)

---

## Testing

### Integration Test (`app/__tests__/page.onboarding.test.tsx`)
- Test page renders without onboarding when flag is set
- Test page renders with onboarding when flag is not set
- Test migration runs on mount
- Test dismissing onboarding doesn't break page
- Test "Start with samples" populates the bookmark list

### Manual Verification
1. Fresh load (no localStorage) → onboarding appears
2. Dismiss onboarding → refresh → onboarding doesn't appear
3. Add bookmark manually → refresh → no onboarding
4. Clear all data → onboarding appears again

---

## Files
- **Modify**: `app/page.tsx`
- **Create**: `app/__tests__/page.onboarding.test.tsx`

---

## Patterns
- Reference: `hooks/useBookmarks.ts` for mount effect pattern (client-side only)
- Reference: Existing `app/page.tsx` structure
