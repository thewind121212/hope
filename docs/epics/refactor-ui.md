---
title: UI Refactor Epic — Bookmark Vault
stack: Next.js 14 (App Router) + TailwindCSS + TypeScript + localStorage
scope: UI/UX refactor + component architecture + accessibility polish
non_goals:
  - No backend / DB
  - No auth / sharing
  - No undo delete
  - No automated tests
---

# EPIC: UI Refactor (Minimal + Animation + Good Color)

## Epic Goal
Refactor Bookmark Vault UI into a product-feeling app:
- Minimal, clean layout with *nice color accents*
- Smooth but subtle animations (no “flashy”)
- Modular component structure
- Great mobile UX
- Clear feedback for actions (toast + dialogs)
- Delete confirmation as a **bottom-sheet dialog** (slides up with a “dragger” handle)

## Definition of Done
- Consistent UI primitives: Button/Input/Card/Badge/Modal/BottomSheet/Toast
- Add/Edit uses **Modal**
- Tag filter uses **Dropdown**
- Sort supports **Newest / Oldest / Title A–Z**
- Delete uses **BottomSheet confirm** (slide-up, dragger handle visible)
- Responsive: usable at 375px width and desktop
- Accessible: labels, focus rings, keyboard nav, escape closes dialogs
- localStorage layer is isolated in `lib/storage.ts`
- No dead code, no duplicated styles

---

# Design Direction (Minimal + Good Color + Animation)

## Visual tokens (Tailwind conventions)
- Radius: `rounded-xl` for cards, `rounded-lg` for controls
- Border: neutral, light (`border`, `border-zinc-200/300`)
- Shadows: soft (`shadow-sm` for cards, `shadow-md` for overlays)
- Accent color: choose ONE brand accent used consistently:
  - Primary: `indigo` (recommended) OR `emerald` OR `rose`
- Focus ring: `focus-visible:ring-2 focus-visible:ring-[accent]-500`

## Motion principles
- Use short durations: `150–220ms`
- Prefer easing: `ease-out`
- Animate:
  - modal open/close
  - bottom sheet slide-up/down
  - toast enter/exit
  - list item hover and subtle “added” highlight
- Avoid animating layout-heavy properties repeatedly.

> Implementation note: You can do motion with pure Tailwind transitions, or Framer Motion. Keep it minimal.

---

# Proposed Folder Structure

## Components
- `components/ui/`
  - `Button.tsx`
  - `Input.tsx`
  - `Textarea.tsx`
  - `Card.tsx`
  - `Badge.tsx`
  - `Select.tsx` (for dropdown)
  - `Modal.tsx` (generic)
  - `BottomSheet.tsx` (for delete confirmation with dragger)
  - `Toast.tsx` + `ToastProvider.tsx`
  - `EmptyState.tsx`

- `components/bookmarks/`
  - `BookmarkFormModal.tsx`
  - `BookmarkCard.tsx`
  - `BookmarkList.tsx`
  - `BookmarkSearchBar.tsx`
  - `BookmarkToolbar.tsx` (search + tag dropdown + sort)
  - `DeleteConfirmSheet.tsx` (uses BottomSheet)

## Logic
- `lib/storage.ts` (load/save + safe parse)
- `lib/bookmarks.ts` (types + helpers: normalize tags, search matcher)
- `lib/utils.ts` (`cn`, small utilities)

## Types
- `types/bookmark.ts`

---

# User Flows (Refactor Targets)

## Flow A: Add bookmark
1. User clicks “Add bookmark”
2. Modal opens with form
3. Submit validates (title+url required)
4. Saves to state + localStorage
5. Toast: “Bookmark added”
6. Modal closes

## Flow B: Edit bookmark
1. User clicks “Edit” on card
2. Modal opens prefilled
3. Save updates item + storage
4. Toast: “Bookmark updated”
5. Modal closes

## Flow C: Search/filter/sort
- Search matches title/url/description/tags
- Tag filter via dropdown (All tags + each unique tag)
- Sort: Newest / Oldest / Title A–Z
- Results count shown

## Flow D: Delete bookmark (BottomSheet with dragger)
1. User clicks “Delete”
2. BottomSheet slides up from bottom
3. Shows:
   - dragger handle (small bar)
   - title + warning text
   - cancel + delete buttons
4. Delete confirms → remove + save → toast “Deleted”
5. BottomSheet closes

---

# EPIC TASKS (Breakdown)

## 1) App Shell + Layout Polish
### Deliverables
- Consistent app layout:
  - Top bar: app title + Add button
  - Main: toolbar + list
  - Empty state
- Responsive container and spacing

### Acceptance Criteria
- Mobile (375px): no overflow, buttons tappable
- Desktop: centered, readable line length

### Files
- `app/layout.tsx`
- `app/page.tsx`
- `components/ui/Card.tsx`

---

## 2) UI Primitives (Minimal + Consistent)
### Deliverables
- `Button` variants:
  - `primary`, `secondary`, `ghost`, `danger`
- `Input`, `Textarea` with labels and errors
- `Badge` for tag chips
- `Select` for dropdown

### Acceptance Criteria
- Focus-visible rings on all inputs/buttons
- Disabled state looks disabled
- One consistent “accent color” used

### Files
- `components/ui/*`

---

## 3) Modal System (Add/Edit)
### Deliverables
- `Modal` component with:
  - overlay
  - ESC closes
  - clicking backdrop closes (optional)
  - smooth open/close animation
- `BookmarkFormModal` supports modes:
  - create
  - edit (prefilled)

### Acceptance Criteria
- Modal traps focus or at least keeps tab order sane
- ESC closes modal
- Submit disabled when invalid
- Validation errors visible and readable

### Files
- `components/ui/Modal.tsx`
- `components/bookmarks/BookmarkFormModal.tsx`

---

## 4) BottomSheet Delete Confirmation (with “dragger”)
### Deliverables
- `BottomSheet` component:
  - slides up from bottom
  - dragger handle visible at top
  - overlay behind
  - close on ESC
  - close on backdrop click
  - optional: close on swipe down (optional if time)
- `DeleteConfirmSheet`:
  - shows bookmark title
  - warning text
  - Cancel / Delete (danger) buttons

### Acceptance Criteria
- Always appears from bottom
- Has clear “dragger” bar
- Delete action cannot be triggered accidentally (requires confirm)

### Files
- `components/ui/BottomSheet.tsx`
- `components/bookmarks/DeleteConfirmSheet.tsx`

---

## 5) Bookmark Card Refactor (Readable + Minimal)
### Deliverables
- Card contents:
  - Title (link opens in new tab)
  - URL (truncated)
  - Description (line clamp)
  - Tags (badges)
  - Actions (Edit/Delete)
- Hover and active states subtle

### Acceptance Criteria
- Long URLs do not break layout
- Tags wrap nicely on mobile
- Actions are accessible (aria-label if icon-only)

### Files
- `components/bookmarks/BookmarkCard.tsx`

---

## 6) Toolbar UX (Search + Tag Dropdown + Sort)
### Deliverables
- `BookmarkToolbar` includes:
  - Search input with clear button
  - Tag dropdown filter (All + unique tags)
  - Sort dropdown (Newest/Oldest/Title A–Z)
  - Results count text
- Search matches title/url/description/tags

### Acceptance Criteria
- Search + tag + sort combine correctly
- “No results” state is friendly

### Files
- `components/bookmarks/BookmarkToolbar.tsx`
- `components/bookmarks/BookmarkSearchBar.tsx`

---

## 7) Toast Feedback (Add/Edit/Delete)
### Deliverables
- Toast provider + hook:
  - `toast.success("...")`
  - `toast.error("...")`
- Animations: slide/fade in-out
- Trigger toasts on:
  - add
  - edit
  - delete
  - storage parse error (optional)

### Acceptance Criteria
- Toast does not block clicks
- Auto-dismiss after a few seconds
- Multiple toasts stack nicely

### Files
- `components/ui/ToastProvider.tsx`
- `components/ui/Toast.tsx`

---

## 8) Storage Layer Cleanup (No DB, just localStorage)
### Deliverables
- `loadBookmarks()` safe parse with fallback `[]`
- `saveBookmarks(bookmarks)` handles stringify
- Optional versioning:
  - store `{version: 1, data: [...]}` to allow future changes

### Acceptance Criteria
- Corrupted localStorage won’t crash UI
- Writes only happen on CRUD, not on every keystroke

### Files
- `lib/storage.ts`
- `types/bookmark.ts`
- `lib/bookmarks.ts`

---

## 9) Accessibility Pass
### Deliverables
- Labels for inputs
- Keyboard navigation:
  - tab order is logical
  - ESC closes modal & bottom sheet
- `aria-label` for icon-only buttons
- Color contrast reasonable

### Acceptance Criteria
- Can add/edit/delete using keyboard only
- No unlabeled interactive elements

---

# UI States Checklist

## Empty states
- No bookmarks: show EmptyState + “Add bookmark”
- No search results: “No results found” + “Clear filters” button

## Error states
- localStorage load fails: show toast + fallback empty list

## Loading states
- Optional skeleton is fine, but not required (localStorage is instant)

---

# Sort & Filter Rules (Single Source of Truth)
- Source list: bookmarks in state
- Derived list:
  1. filter by tag (unless “All”)
  2. filter by search query
  3. sort by selected sort key

---

# Estimation (Realistic 4–5 hours)
1) UI primitives: 45–60m
2) Shell layout: 20–30m
3) Modal form: 45–60m
4) BottomSheet delete: 45–60m
5) Toolbar (search/filter/sort): 30–45m
6) Toast system: 20–30m
7) A11y + polish: 20–30m

---

# Final “Polish” Checklist (Before You Stop)
- All buttons have hover + focus styles
- Mobile: no cramped controls
- Title link uses `target="_blank" rel="noopener noreferrer"`
- Delete is always confirmed in bottom sheet
- No console errors
- Code is organized: UI primitives reused everywhere

