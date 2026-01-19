# T005: Create OnboardingPanel Component

**ID**: T005
**Phase**: Phase 2 - UI Foundation (FE)
**Status**: pending
**Dependencies**: T001, T002

---

## Action
Create a client-side onboarding panel component for first-time users.

---

## Business Summary
Provide a friendly first-run experience that explains the app's core features and offers users the option to start with sample bookmarks or skip to an empty state.

---

## Logic

### Display Conditions
- Only show when `hasSeenOnboarding()` returns false
- Check flag on component mount
- Automatically dismiss after user action

### User Actions
1. **"Start with samples"**:
   - Load demo bookmarks (from T002)
   - Add to localStorage via `useBookmarks.addBookmark()`
   - Mark onboarding as seen
   - Dismiss panel

2. **"Skip"**:
   - Mark onboarding as seen
   - Dismiss panel
   - Leave bookmarks empty

---

## Technical Logic

### Component Structure
```tsx
"use client"

import { useEffect, useState } from 'react';
import { hasSeenOnboarding, markOnboardingSeen } from '@/lib/onboarding';
import { useBookmarks } from '@/hooks/useBookmarks';
import { demoBookmarks } from '@/lib/demoBookmarks';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export function OnboardingPanel() {
  const [isVisible, setIsVisible] = useState(false);
  const { addBookmark } = useBookmarks();

  useEffect(() => {
    // Only check on client-side mount
    if (!hasSeenOnboarding()) {
      setIsVisible(true);
    }
  }, []);

  const handleStartWithSamples = async () => {
    for (const bookmark of demoBookmarks) {
      await addBookmark(bookmark);
    }
    markOnboardingSeen();
    setIsVisible(false);
  };

  const handleSkip = () => {
    markOnboardingSeen();
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <Modal onClose={handleSkip}>
      {/* Onboarding content */}
    </Modal>
  );
}
```

### Content Requirements
- **Title**: "Welcome to Bookmark Vault!"
- **3 Tips**:
  1. "Add bookmarks with titles, URLs, and tags"
  2. "Search and filter to find anything fast"
  3. "Export your data to keep it safe"
- **Primary CTA**: "Start with sample bookmarks"
- **Secondary Action**: "Skip, I'll explore myself"

### Styling
- Use Card or Modal component from `components/ui/`
- Friendly, encouraging tone
- Subtle highlight on primary CTA
- Responsive (mobile-friendly)

---

## Testing

### Component Tests (`components/onboarding/__tests__/OnboardingPanel.test.tsx`)
- Mock `hasSeenOnboarding` to control visibility
- Test panel doesn't render when flag is true
- Test panel renders when flag is false
- Test "Start with samples" calls `addBookmark` for each demo
- Test "Start with samples" calls `markOnboardingSeen`
- Test "Skip" calls `markOnboardingSeen` without adding bookmarks
- Test panel dismisses after either action

---

## Files
- **Create**: `components/onboarding/OnboardingPanel.tsx`
- **Create**: `components/onboarding/__tests__/OnboardingPanel.test.tsx`

---

## Patterns
- Reference: `components/ui/Modal.tsx` for modal structure
- Reference: `hooks/useBookmarks.ts` for addBookmark pattern
- Reference: T002 for `demoBookmarks` import
