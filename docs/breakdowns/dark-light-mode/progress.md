# Dark/Light Mode — Progress Log

## Epic
`docs/epics/dark-light-mode.md`

## Status Overview

| Task | State | Completed | Verified |
|------|-------|-----------|----------|
| T001 | done | 2026-01-19 | pending |
| T002 | done | 2026-01-19 | pending |
| T003 | done | 2026-01-19 | pending |
| T004 | done | 2026-01-19 | pending |
| T005 | done | 2026-01-19 | pending |
| T006 | done | 2026-01-19 | pending |
| T007 | done | 2026-01-19 | pending |
| T008 | done | 2026-01-19 | pending |

---

## Task Log

### T001: Create Theme Storage Module
- **State**: done
- **Started**: 2026-01-19
- **Completed**: 2026-01-19
- **Testing**: Manual - user to verify localStorage persistence
- **Notes**: Created `lib/theme.ts` with:
  - `ThemeMode` and `ResolvedTheme` types
  - `getStoredTheme()` / `setStoredTheme()` with SSR guards
  - `resolveTheme()` using `matchMedia`
  - `applyThemeClass()` to toggle `.dark` on `<html>`

### T002: Enable Tailwind Class-Based Dark Mode
- **State**: done
- **Started**: 2026-01-19
- **Completed**: 2026-01-19
- **Testing**: Manual - add `class="dark"` to `<html>` in devtools
- **Notes**: Updated `app/globals.css`:
  - Replaced `@media (prefers-color-scheme: dark)` with `.dark` selector
  - CSS variables now switch based on `.dark` class presence

### T003: Create ThemeScript Component
- **State**: done
- **Started**: 2026-01-19
- **Completed**: 2026-01-19
- **Testing**: Manual - verify no flash on page load
- **Notes**: Created `components/theme/ThemeScript.tsx`:
  - Inline script that runs before React hydration
  - Reads localStorage, resolves theme, applies class immediately
  - Prevents flash of wrong theme

### T004: Create ThemeContext + useTheme Hook
- **State**: done
- **Started**: 2026-01-19
- **Completed**: 2026-01-19
- **Testing**: Manual - toggle theme via React DevTools
- **Notes**: Created `hooks/useTheme.ts`:
  - `ThemeProvider` wraps app with context
  - `useTheme()` returns `{ mode, resolvedTheme, setMode }`
  - Initializes from localStorage on mount

### T005: Build ThemeToggle Dropdown Component
- **State**: done
- **Started**: 2026-01-19
- **Completed**: 2026-01-19
- **Testing**: Manual - click toggle, verify all 3 options work
- **Notes**: Created `components/theme/ThemeToggle.tsx`:
  - Dropdown with Light/Dark/System options
  - Sun/Moon/Monitor icons for each mode
  - Checkmark indicates current selection
  - Uses existing DropdownMenu and Button components

### T006: Integrate ThemeToggle into Header Layout
- **State**: done
- **Started**: 2026-01-19
- **Completed**: 2026-01-19
- **Testing**: Manual - verify toggle in header, refresh preserves choice
- **Notes**: Updated `app/layout.tsx`:
  - Added `ThemeScript` in `<head>`
  - Wrapped content with `ThemeProvider`
  - Added `ThemeToggle` to header (far-right)
  - Added `suppressHydrationWarning` to `<html>`
  - Created `components/theme/index.ts` barrel export

### T007: Add System Theme Change Listener
- **State**: done
- **Started**: 2026-01-19
- **Completed**: 2026-01-19
- **Testing**: Manual - set to System, change OS theme, verify live update
- **Notes**: Implemented in `hooks/useTheme.ts`:
  - `useEffect` listens to `matchMedia` change event when mode is `system`
  - Updates `<html>` class and `resolvedTheme` state on OS theme change
  - Cleans up listener on unmount or mode change

### T008: Audit Dark Mode Styles
- **State**: done
- **Started**: 2026-01-19
- **Completed**: 2026-01-19
- **Testing**: Manual - toggle between themes, visually inspect all components
- **Notes**: Fixed missing `dark:*` classes in:
  - `components/bookmarks/BookmarkCard.tsx` - checkbox, URL link, status text
  - `components/bookmarks/FilterChips.tsx` - chip background/text colors
  - `components/ui/KeyboardShortcutsHelp.tsx` - footer kbd styling
  - `components/ui/Input.tsx` - helper text, error text
  - `components/ui/Textarea.tsx` - helper text, error text
  - `components/ui/Select.tsx` - helper text, error text
  - `app/page.tsx` - subtitle text
