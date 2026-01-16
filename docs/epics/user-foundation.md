---
title: User Foundation Epic — Bookmark Vault
stack: Next.js 14 (App Router) + TailwindCSS + TypeScript + localStorage
scope: onboarding + data safety + core productivity
non_goals:
  - No backend / DB
  - No auth / sharing
  - No collaboration
  - No analytics
---

# EPIC: User Foundation (Mandatory App Experience)

## Epic Goal
Make the app feel "must-use" on day one by improving onboarding, data safety, and fast daily actions:
- Friendly first-run onboarding
- Clear guidance for required fields and URL validation
- Easy backup/restore (export/import)
- Safer destructive actions
- Quick shortcuts for power users

## Definition of Done
- First-run onboarding is shown only once and can be skipped
- Empty state teaches the core workflow and includes a primary CTA
- Add/Edit form validates title + URL with helpful error copy
- Import/Export supports JSON (CSV optional if time)
- Destructive actions have confirm steps and show clear feedback
- Keyboard shortcuts for Add and Search are documented in the UI

---

# Design Direction (Friendly + Confident)

## Visual tokens
- Accent color: reuse existing brand accent
- Onboarding uses Card layout with small illustrations/icons
- Provide subtle highlight around the primary CTA

## Content tone
- Short, helpful, action-focused copy
- Avoid jargon

---

# User Flows (Foundation Targets)

## Flow A: First run onboarding
1. App detects first launch (no bookmarks, no flag)
2. Onboarding panel appears with 3 quick tips
3. User can:
   - Start with sample bookmarks
   - Skip (empty state remains)
4. Onboarding never shows again once dismissed

## Flow B: Add/Edit validation
1. User opens Add/Edit
2. Required fields are labeled and validated
3. Invalid URL shows helpful hint
4. Save is disabled until valid

## Flow C: Export/Import
1. User opens "Manage data" panel
2. Export downloads JSON
3. Import accepts JSON and previews the count
4. Confirmation required before overwrite

## Flow D: Quick actions
- Shortcut: `A` opens Add
- Shortcut: `/` focuses search
- Help tooltip shows shortcuts

---

# EPIC TASKS (Breakdown)

## 1) First-Run Onboarding Panel
### Deliverables
- Onboarding card with 3 bullets
- "Start with samples" and "Skip" actions
- `localStorage` flag to avoid re-show

### Acceptance Criteria
- Onboarding shows only once
- Skipping persists across refresh

### Files
- `components/onboarding/OnboardingPanel.tsx`
- `lib/storage.ts`

---

## 2) Empty State + Required CTA
### Deliverables
- Empty state with clear CTA
- CTA opens Add modal
- Small help text about tags/search

### Acceptance Criteria
- Empty state visible only when list is empty
- CTA is visually prominent

### Files
- `components/ui/EmptyState.tsx`
- `app/page.tsx`

---

## 3) Validation + Error Copy
### Deliverables
- URL validation (basic regex or `URL` constructor)
- Clear error text for missing title/URL
- Save disabled until valid

### Acceptance Criteria
- Invalid inputs never save
- Errors are readable on mobile

### Files
- `components/bookmarks/BookmarkFormModal.tsx`
- `lib/bookmarks.ts`

---

## 4) Import/Export Data (JSON)
### Deliverables
- "Manage data" panel or modal
- Export to JSON file
- Import JSON with preview + confirm

### Acceptance Criteria
- Import does not crash on invalid JSON
- Confirmation required before overwrite

### Files
- `components/bookmarks/ManageDataModal.tsx`
- `lib/storage.ts`

---

## 5) Quick Actions + Help Tooltip
### Deliverables
- Keyboard shortcuts (`A`, `/`)
- Tooltip or small help popover

### Acceptance Criteria
- Shortcuts work across the main screen
- Help text is discoverable

### Files
- `components/bookmarks/BookmarkToolbar.tsx`
- `components/ui/Tooltip.tsx`

---

# Estimation (Realistic 3–4 hours)
1) Onboarding: 45–60m
2) Empty state polish: 20–30m
3) Validation + copy: 30–45m
4) Import/Export: 60–75m
5) Shortcuts + help: 20–30m

---

# Final “Polish” Checklist (Before You Stop)
- Onboarding has concise copy and one primary CTA
- Invalid inputs never save
- Import warnings are clear and prevent data loss
- Shortcut hints are visible and accurate
- No console errors
