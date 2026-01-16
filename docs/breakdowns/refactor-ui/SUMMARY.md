# UI Refactor Epic — Bookmark Vault

## Project Tech Context
- Stack: Next.js 14 (App Router) + TailwindCSS + TypeScript
- Storage: client-side localStorage only
- UI direction: minimal UI, rose accent, subtle animations
- Motion: Framer Motion
- Toasts: Sonner
- Testing: manual verification only (no automated tests)

## Scope & Logic Overview
- Refactor UI into modular primitives and feature components.
- Introduce consistent design tokens (radius, borders, shadow, accent color).
- Add modal flow for add/edit and bottom-sheet confirm for delete.
- Implement toolbar with search, tag filter, and sort, with derived list logic.
- Harden storage parsing and ensure accessibility.

## Decisions & Q&A Log
- Accent color: rose
- Motion: Framer Motion
- UI primitives path: components/ui/*
- Toast library: Sonner
- Testing: manual only (no E2E/unit tests)

## Task Tree (10 tasks)
- T001 — FE: App Shell & Layout Refresh
- T002 — FE: Core UI Primitives (Button/Input/Textarea/Card/Badge)
- T003 — FE: Select + EmptyState Primitives
- T004 — FE: Modal Primitive + BookmarkFormModal (Add/Edit)
- T005 — FE: BottomSheet Primitive + DeleteConfirmSheet
- T006 — FE: Toast System (Sonner)
- T007 — FE: Toolbar UX (Search + Tag Filter + Sort)
- T008 — FE: Bookmark Card Refactor
- T009 — FE: Bookmark List + Page Wiring
- T010 — FE: Storage Safety + Accessibility Pass
