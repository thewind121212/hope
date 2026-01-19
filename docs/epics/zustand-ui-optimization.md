---
title: Epic — Zustand UI Optimization (Faster Loading + Interaction)
stack: Next.js (App Router) + React 19 + TypeScript + TailwindCSS + Zustand
scope: reduce rerenders + prop drilling; improve perceived responsiveness
non_goals:
  - Do not replace bookmarks data source-of-truth (`hooks/useBookmarks.ts`) in this epic
  - Do not persist filters to localStorage in this epic
  - Do not move bulk selection into global state
---

# EPIC: Zustand UI Optimization (Performance + UX)

## Epic Goal
Make the app feel faster and more responsive by:
- Moving **page-global UI state** to Zustand (filters + modal/sheet open state)
- Reducing rerenders caused by prop drilling and unstable callbacks
- Applying a targeted render reduction pass (memo + selector usage)

## Current Pain Points (Observed)
- `app/page.tsx` owns many UI states and passes them deep into the tree.
- Filter and modal state changes can cause broad rerenders even when only one section needs to update.

## Scope (What moves to Zustand)
Move these from `useState` into Zustand:
- Filters: `selectedSpaceId`, `searchQuery`, `selectedTag`, `sortKey`
- Overlay state: `isFormOpen`, `isImportExportOpen`, `isSpacesOpen`

Keep local (not in Zustand):
- `useBookmarks` provider state (bookmarks list CRUD)
- Bulk selection (`useBookmarkSelection`)
- Local UI state: TagInput draft, dropdown open, preview loading flags, etc.

## Definition of Done
- Zustand store exists with:
  - state: filters + overlay flags
  - actions: setters + `clearAllFilters()` + `applyPinnedView(view)` + open/close helpers
- `app/page.tsx` no longer uses `useState` for global UI state
- Components read state via selectors so only the minimum rerenders happen:
  - Toolbar subscribes only to filter fields + clear action
  - Sidebar subscribes only to selected space + apply view action
  - List subscribes only to filters needed to compute view
- Keyboard shortcuts call store actions directly (no prop callbacks)
- Render reduction pass applied:
  - memoize heavy components where needed
  - stabilize handlers (store actions are stable)
- No hydration mismatch introduced (store is client-only; no localStorage reads during SSR render)
- Basic unit tests for store actions exist

## Store Design (Performance-first)
- Create `stores/useUiStore.ts`
- Use selector-based access everywhere; avoid subscribing to whole store.
- Use `shallow` comparator when selecting multiple values.

## Tasks (Agent-Friendly)
1) Add Zustand dependency
2) Create `useUiStore` (filters + overlays + actions)
3) Refactor `app/page.tsx` to use store selectors/actions
4) Refactor `BookmarkListView`/`BookmarkToolbar` to consume store state with minimal props
5) Refactor `SpacesSidebar` pinned view apply to use `applyPinnedView(view)`
6) Refactor `useKeyboardShortcuts` integration to call store actions
7) Render reduction pass:
   - identify rerender hotspots
   - apply `React.memo` where it helps
   - remove unnecessary `useMemo/useCallback` props churn
8) Add unit tests for store actions:
   - `clearAllFilters`
   - `applyPinnedView`
   - open/close modal actions

## Acceptance Criteria
- Typing search does not rerender unrelated UI (sidebar, modals)
- Switching tag/sort/space feels instant
- Opening/closing modals does not cause full list rerender
