---
title: Visual Preview Cards Breakdown
phase: Build
created: 2026-01-19
---

# Summary

## Context
- **Stack**: Next.js (App Router) + TailwindCSS + TypeScript + localStorage + Zod
- **Epic**: Visual Preview Cards (Wow Link UI)

## Architectural Decisions
1. Preview model: extend Bookmark with optional preview fields
2. Fetch strategy: Next.js route handler (`/api/link-preview`) to avoid CORS
3. Image handling: Direct reference (no local download)
4. Testing: None required

## Task Tree

### Phase 1: Backend (API + Types)
| ID | Task |
|----|------|
| T001 | Extend BookmarkType with preview fields |
| T002 | Add PreviewSchema to validation |
| T003 | Create link-preview API route handler |

### Phase 2: Frontend State
| ID | Task |
|----|------|
| T004 | Update storage layer with preview caching |
| T005 | Extend useBookmarks with preview actions |

### Phase 3: UI Components
| ID | Task |
|----|------|
| T006 | Build BookmarkCard preview UI |
| T007 | Add skeleton & error states |
| T008 | Add refresh preview action |

### Phase 4: Settings
| ID | Task |
|----|------|
| T009 | Add preview toggle to settings |

## Dependencies
T001 → T002 → T003 → T004 → T005 → T006 → T007 → T008 → T009
