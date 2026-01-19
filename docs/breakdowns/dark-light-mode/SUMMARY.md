# Dark/Light Mode Breakdown

## Epic Reference
`docs/epics/dark-light-mode.md`

## User Decisions
| Question | Answer |
|----------|--------|
| Toggle UI Style | Dropdown menu (icon → Light/Dark/System options) |
| Toggle Placement | Header — far right corner |
| Testing Scope | Manual QA only |
| Frontend Tests | No |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  app/layout.tsx                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  <ThemeScript />  ← inline script, runs before paint│    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  <ThemeProvider>                                    │    │
│  │    ├─ header with <ThemeToggle /> (far right)       │    │
│  │    └─ {children}                                    │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘

lib/theme.ts
  ├─ getStoredTheme(): ThemeMode | null
  ├─ setStoredTheme(mode: ThemeMode): void
  └─ resolveTheme(mode: ThemeMode): 'light' | 'dark'

hooks/useTheme.ts
  └─ ThemeContext + useTheme() hook
```

## Task Tree

| ID | Action | Summary | State |
|----|--------|---------|-------|
| T001 | Create theme storage module | Foundation for persisting user preference | pending |
| T002 | Enable Tailwind class-based dark mode | Switch CSS from media-query to class-based | pending |
| T003 | Create ThemeScript component | Prevent flash on initial load | pending |
| T004 | Create ThemeContext + useTheme hook | React state management for theme | pending |
| T005 | Build ThemeToggle dropdown | User-facing UI control | pending |
| T006 | Integrate into header layout | Place toggle in far-right header | pending |
| T007 | Add system theme change listener | Live update when OS theme changes | pending |
| T008 | Audit dark mode styles | Verify all UI components render correctly | pending |

## Dependency Graph

```
T001 (storage) ──┬──► T003 (script) ──┬──► T006 (integrate)
                 │                    │
                 └──► T004 (context) ─┘
                           │
T002 (tailwind) ───────────┴──► T005 (toggle) ──► T006
                                                    │
                                      T007 (listener) ◄─┘
                                                    │
                                      T008 (audit) ◄─┘
```

## Files Created/Modified

| File | Action |
|------|--------|
| `lib/theme.ts` | Create |
| `app/globals.css` | Modify |
| `components/theme/ThemeScript.tsx` | Create |
| `components/theme/ThemeProvider.tsx` | Create |
| `components/theme/ThemeToggle.tsx` | Create |
| `components/theme/index.ts` | Create (barrel) |
| `hooks/useTheme.ts` | Create |
| `app/layout.tsx` | Modify |
