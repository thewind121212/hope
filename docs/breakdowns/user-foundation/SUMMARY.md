# User Foundation Epic - Task Breakdown

**Epic**: [User Foundation](../../epics/user-foundation.md)
**Generated**: 2025-01-17
**Status**: Ready for Implementation

---

## Architecture Decisions (User Answers)

| Decision | Value | Rationale |
|----------|-------|-----------|
| **Backend Testing** | Unit Tests (Jest) | Test `lib/` utilities and storage functions in isolation |
| **Frontend Testing** | Yes (React Testing Library) | Component tests for onboarding, empty state, validation, modals |
| **Sample Bookmarks** | Predefined Demo Bookmarks | 3-5 curated examples to showcase app capabilities |
| **Confirm Actions** | Delete + Replace All | Confirm single bookmark delete AND import "replace all" operations |

---

## Task Tree Overview

```
user-foundation/
├── Phase 1: Foundation (BE)
│   ├── T001: Create localStorage flag utilities
│   ├── T002: Add demo bookmarks data constants
│   ├── T003: Create storage migration utilities
│   └── T004: BE Unit Tests (lib/)
│
├── Phase 2: UI Foundation (FE)
│   ├── T005: Create OnboardingPanel component
│   ├── T006: Create EmptyState component
│   ├── T007: Create ConfirmDialog component
│   ├── T008: Create Tooltip/KB Shortcuts component
│   └── T009: FE Component Tests
│
├── Phase 3: Validation Enhancement
│   ├── T010: Enhance URL validation in Zod schema
│   ├── T011: Update BookmarkFormModal with validation UI
│   └── T012: Validation flow testing
│
├── Phase 4: Import/Export Polish
│   ├── T013: Create ManageDataModal
│   ├── T014: Add delete confirmation flow
│   ├── T015: Add import replace confirmation
│   └── T016: Import/Export E2E testing
│
└── Phase 5: Integration & Polish
    ├── T017: Integrate onboarding to main page
    ├── T018: Integrate empty state to main page
    ├── T019: Integrate keyboard shortcuts help
    ├── T020: Final integration testing
```

---

## Task Details

### Phase 1: Foundation (BE)

#### T001: Create localStorage Flag Utilities
- **Action**: Create
- **Business Summary**: Establish a reliable pattern for tracking user onboarding state across sessions
- **Logic**: Create utility functions to get/set onboarding completion flag in localStorage
- **Technical Logic**:
  - Add `hasSeenOnboarding` flag check/set functions
  - Ensure client-side only execution
  - Handle missing localStorage gracefully
- **Testing**: Unit test flag get/set/clear operations
- **State**: pending
- **Files**:
  - Create: `lib/onboarding.ts`
- **Patterns**: Reference existing `lib/storage.ts`

#### T002: Add Demo Bookmarks Data
- **Action**: Create
- **Business Summary**: Provide curated sample bookmarks for new users to understand app capabilities
- **Logic**: Define 3-5 example bookmarks with diverse categories (dev tools, docs, resources)
- **Technical Logic**:
  - Create array of bookmark objects matching `BookmarkSchema`
  - Include variety: tags, descriptions, different URLs
  - Export as constant for onboarding use
- **Testing**: Validate demo data against Zod schema in unit test
- **State**: pending
- **Files**:
  - Create: `lib/demoBookmarks.ts`
- **Patterns**: Reference `lib/types.ts` for Bookmark interface

#### T003: Create Storage Migration Utilities
- **Action**: Create
- **Business Summary**: Handle data migration for existing users who haven't seen onboarding
- **Logic**: Check if user has bookmarks but no onboarding flag, set flag appropriately
- **Technical Logic**:
  - Migration function checks bookmark count + onboarding flag
  - Set flag if bookmarks exist (user has already started)
  - Don't show onboarding to active users
- **Testing**: Unit test migration scenarios (new user, existing user, empty state)
- **State**: pending
- **Files**:
  - Create: `lib/migration.ts`
  - Modify: `lib/onboarding.ts` (export migration function)
- **Patterns**: Reference `lib/storage.ts` get/set patterns

#### T004: BE Unit Tests
- **Action**: Create
- **Business Summary**: Ensure backend utilities (storage, onboarding, validation) work correctly
- **Logic**: Unit tests for lib/ functions with mocked localStorage
- **Technical Logic**:
  - Mock localStorage for all tests
  - Test onboarding flag operations
  - Test demo bookmarks schema validation
  - Test migration logic scenarios
- **Testing**: Jest unit tests
- **State**: pending
- **Files**:
  - Create: `lib/__tests__/onboarding.test.ts`
  - Create: `lib/__tests__/migration.test.ts`
  - Create: `lib/__tests__/demoBookmarks.test.ts`
- **Patterns**: Check if Jest is configured, add if needed

---

### Phase 2: UI Foundation (FE)

#### T005: Create OnboardingPanel Component
- **Action**: Create
- **Business Summary**: Friendly first-run experience that explains app and offers sample data
- **Logic**: Card-style panel with 3 tips, "Start with samples" and "Skip" actions
- **Technical Logic**:
  - Client component with "use client"
  - Check onboarding flag on mount
  - Load demo bookmarks on "Start with samples"
  - Set flag and dismiss on either action
  - Use existing Modal or Card component
- **Testing**: Component test for flag check, dismiss actions, sample loading
- **State**: pending
- **Files**:
  - Create: `components/onboarding/OnboardingPanel.tsx`
- **Patterns**: Reference `components/ui/Modal.tsx` and `hooks/useBookmarks.ts`

#### T006: Create EmptyState Component
- **Business Summary**: Clear guidance when no bookmarks exist with primary CTA to add first
- **Logic**: Conditional render when bookmark list is empty
- **Technical Logic**:
  - Accepts `onAdd` callback for CTA
  - Shows helpful copy about tags/search
  - Visually prominent CTA button
  - Icon or illustration
- **Testing**: Component test for render, CTA click callback
- **State**: pending
- **Files**:
  - Create: `components/ui/EmptyState.tsx`
- **Patterns**: Reference existing empty list handling in `app/page.tsx`

#### T007: Create ConfirmDialog Component
- **Action**: Create
- **Business Summary**: Reusable confirmation dialog for destructive actions
- **Logic**: Modal with title, message, cancel/confirm buttons
- **Technical Logic**:
  - Accept `onConfirm`, `onCancel` callbacks
  - Configurable title/description
  - Danger styling for confirm button
  - Keyboard support (Esc to cancel, Enter to confirm)
- **Testing**: Component test for confirm/cancel callbacks, keyboard
- **State**: pending
- **Files**:
  - Create: `components/ui/ConfirmDialog.tsx`
- **Patterns**: Reference `components/ui/Modal.tsx`

#### T008: Create Keyboard Shortcuts Help
- **Action**: Create
- **Business Summary**: Discoverable documentation for available keyboard shortcuts
- **Logic**: Tooltip or popover showing all shortcuts with key visual
- **Technical Logic**:
  - Display shortcuts from existing `useKeyboardShortcuts.ts`
  - Keyboard key styling (e.g., `[A]`, `[/]`)
  - Triggerable via button or icon
  - Positionable tooltip/popover
- **Testing**: Component test for render, trigger interactions
- **State**: pending
- **Files**:
  - Create: `components/ui/KeyboardShortcutsHelp.tsx`
- **Patterns**: Reference existing tooltip pattern if exists, else use `components/ui/`

#### T009: FE Component Tests
- **Action**: Create
- **Business Summary**: Verify UI components render and interact correctly
- **Logic**: React Testing Library tests for new components
- **Technical Logic**:
  - Mock hooks (useBookmarks, useOnboarding)
  - Test user interactions (click, keyboard)
  - Test conditional rendering states
  - Test callback invocations
- **Testing**: React Testing Library component tests
- **State**: pending
- **Files**:
  - Create: `components/onboarding/__tests__/OnboardingPanel.test.tsx`
  - Create: `components/ui/__tests__/EmptyState.test.tsx`
  - Create: `components/ui/__tests__/ConfirmDialog.test.tsx`
  - Create: `components/ui/__tests__/KeyboardShortcutsHelp.test.tsx`
- **Patterns**: Check if RTL is configured, add if needed

---

### Phase 3: Validation Enhancement

#### T010: Enhance URL Validation
- **Action**: Modify
- **Business Summary**: Ensure bookmark URLs are valid with helpful error messages
- **Logic**: Strengthen Zod schema for URL validation
- **Technical Logic**:
  - Use Zod's `.url()` or custom regex
  - Support common protocols (http, https, mailto, etc.)
  - Custom error messages for readability
  - Handle edge cases (spaces, invalid chars)
- **Testing**: Unit test various valid/invalid URLs
- **State**: pending
- **Files**:
  - Modify: `lib/validation.ts`
- **Patterns**: Reference existing `BookmarkSchema` in `lib/validation.ts`

#### T011: Update BookmarkFormModal Validation UI
- **Action**: Modify
- **Business Summary**: Show clear, readable validation errors to users
- **Logic**: Display error messages below inputs, disable save until valid
- **Technical Logic**:
  - Use errors from `useBookmarkForm.ts` hook
  - Style errors for mobile readability
  - Disable submit button when form invalid
  - Focus first invalid field on submit attempt
- **Testing**: Component test for error display, button state
- **State**: pending
- **Files**:
  - Modify: `components/bookmarks/BookmarkFormModal.tsx`
- **Patterns**: Reference existing form handling in `BookmarkFormModal.tsx`

#### T012: Validation Flow Testing
- **Action**: Create
- **Business Summary**: End-to-end validation of form submission flow
- **Logic**: Integration test for form validation
- **Technical Logic**:
  - Test valid submit succeeds
  - Test invalid inputs show errors
  - Test save button disabled state
  - Test error clearing on input
- **Testing**: Integration test with mock hooks
- **State**: pending
- **Files**:
  - Create: `components/bookmarks/__tests__/BookmarkFormModal.validation.test.tsx`
- **Patterns**: Reference `useBookmarkForm.ts` for validation logic

---

### Phase 4: Import/Export Polish

#### T013: Create ManageDataModal
- **Action**: Create
- **Business Summary**: Centralized panel for data management operations
- **Logic**: Modal with export/import actions, data stats
- **Technical Logic**:
  - Show current bookmark count
  - Export button triggers JSON download
  - Import button triggers file picker
  - Reuse existing `ImportExportModal` logic if possible
- **Testing**: Component test for export/import triggers
- **State**: pending
- **Files**:
  - Create or Modify: `components/bookmarks/ManageDataModal.tsx`
- **Patterns**: Reference `components/bookmarks/ImportExportModal.tsx`

#### T014: Add Delete Confirmation
- **Action**: Modify
- **Business Summary**: Prevent accidental bookmark deletion
- **Logic**: Show confirmation dialog before delete
- **Technical Logic**:
  - Wrap delete action in ConfirmDialog
  - Show bookmark title in confirmation
  - Only delete on explicit confirm
- **Testing**: Component test for confirm/cancel delete
- **State**: pending
- **Files**:
  - Modify: `components/bookmarks/BookmarkList.tsx` or delete handler location
- **Patterns**: Use new `ConfirmDialog` component from T007

#### T015: Add Import Replace Confirmation
- **Action**: Modify
- **Business Summary**: Prevent accidental data loss during import
- **Logic**: Show confirmation when importing with "replace" mode
- **Technical Logic**:
  - Detect "replace" mode in import flow
  - Show count of bookmarks to be replaced
  - Only proceed on explicit confirm
  - Warning styling for destructive action
- **Testing**: Component test for replace confirmation
- **State**: pending
- **Files**:
  - Modify: `components/bookmarks/ImportExportModal.tsx` or `hooks/useImportBookmarks.ts`
- **Patterns**: Reference existing import flow, add confirmation step

#### T016: Import/Export E2E Testing
- **Action**: Create
- **Business Summary**: Verify complete import/export workflows work correctly
- **Logic**: Integration tests for data operations
- **Technical Logic**:
  - Test export creates valid JSON
  - Test import with merge mode
  - Test import with replace + confirmation
  - Test invalid JSON handling
- **Testing**: Integration test with mocked storage
- **State**: pending
- **Files**:
  - Create: `hooks/__tests__/useImportBookmarks.e2e.test.ts`
  - Create: `components/bookmarks/__tests__/ImportExportModal.e2e.test.tsx`
- **Patterns**: Reference `useImportBookmarks.ts` and import flow

---

### Phase 5: Integration & Polish

#### T017: Integrate Onboarding to Main Page
- **Action**: Modify
- **Business Summary**: Show onboarding to first-time users
- **Logic**: Conditionally render OnboardingPanel based on flag
- **Technical Logic**:
  - Check onboarding flag on client mount
  - Show OnboardingPanel if flag not set
  - Hide when dismissed
  - Run migration on first load
- **Testing**: Integration test for onboarding display/dismiss
- **State**: pending
- **Files**:
  - Modify: `app/page.tsx`
- **Patterns**: Reference `hooks/useBookmarks.ts` mount pattern

#### T018: Integrate Empty State to Main Page
- **Action**: Modify
- **Business Summary**: Show helpful empty state when no bookmarks
- **Logic**: Replace or enhance current empty list view
- **Technical Logic**:
  - Check bookmark list length
  - Show EmptyState if empty
  - Hide when bookmarks exist
  - Pass `onAdd` callback to open modal
- **Testing**: Integration test for empty state render/hide
- **State**: pending
- **Files**:
  - Modify: `app/page.tsx`
- **Patterns**: Reference existing list rendering in `app/page.tsx`

#### T019: Integrate Keyboard Shortcuts Help
- **Action**: Modify
- **Business Summary**: Make shortcuts discoverable in UI
- **Logic**: Add help button/tooltip to toolbar or header
- **Technical Logic**:
  - Place help icon in BookmarkToolbar or header
  - On click/press, show KeyboardShortcutsHelp
  - Ensure shortcuts match `useKeyboardShortcuts.ts`
- **Testing**: Integration test for help trigger
- **State**: pending
- **Files**:
  - Modify: `components/bookmarks/BookmarkToolbar.tsx` or `app/page.tsx`
- **Patterns**: Reference `useKeyboardShortcuts.ts` for shortcut list

#### T020: Final Integration Testing
- **Action**: Create
- **Business Summary**: Verify all features work together correctly
- **Logic**: Comprehensive integration tests
- **Technical Logic**:
  - Test full onboarding flow
  - Test add/edit/delete with validation
  - Test import/export with confirmations
  - Test empty state → populated state transition
  - Test keyboard shortcuts
- **Testing**: Integration tests for complete user flows
- **State**: pending
- **Files**:
  - Create: `app/__tests__/page.integration.test.tsx`
- **Patterns**: Comprehensive flow testing

---

## Progress Tracking

See [progress.md](./progress.md) for detailed task status and verification logs.
