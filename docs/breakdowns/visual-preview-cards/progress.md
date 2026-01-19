# Progress Tracker

## Task Status
| ID | Task | Status |
|----|------|--------|
| T001 | Extend BookmarkType | done |
| T002 | Add PreviewSchema | done |
| T003 | Create link-preview API | done |
| T004 | Update storage layer | done |
| T005 | Extend useBookmarks | done |
| T006 | Build BookmarkCard preview UI | done |
| T007 | Add skeleton & error states | done |
| T008 | Add refresh preview action | done |
| T009 | Add preview toggle | done |

## Completed Tasks Log

### T001: Extend BookmarkType (2026-01-19)
**What was done**: Added optional `preview` object to Bookmark interface with fields: `faviconUrl`, `siteName`, `ogImageUrl`, `previewTitle`, `previewDescription`, `lastFetchedAt`.

**Files modified**: `lib/types.ts`

### T002: Add PreviewSchema (2026-01-19)
**What was done**: Created `PreviewSchema` in validation.ts with Zod validation for all preview fields (nullable, optional, URL validation for image fields).

**Files modified**: `lib/validation.ts`

### T003: Create link-preview API (2026-01-19)
**What was done**: Created `/api/link-preview/route.ts` with:
- URL validation with allowed protocols
- Fetch with 5s timeout and 1MB body limit
- Meta tag parsing for og:title, og:description, og:image, twitter:*
- Favicon extraction from link tag or default /favicon.ico
- Returns JSON with preview data or error

**Files created**: `app/api/link-preview/route.ts`

### T004: Update storage layer (2026-01-19)
**What was done**: Added preview caching functions with 7-day TTL policy:
- `getPreview(bookmarkId)`: retrieves cached preview if not stale
- `savePreview(bookmarkId, preview)`: stores preview with timestamp
- `deletePreview(bookmarkId)`: removes preview from cache
- `clearStalePreviews()`: cleans old entries on mount

**Files modified**: `lib/storage.ts`

### T005: Extend useBookmarks (2026-01-19)
**What was done**: Added preview actions to bookmarks context:
- `fetchPreview(id, url)`: fetches preview from API, caches and updates state
- `refreshPreview(id, url)`: forces refetch bypassing cache
- Added `UPDATE_PREVIEW_SUCCESS` action to reducer
- Clears stale previews on provider mount

**Files modified**: `hooks/useBookmarks.ts`

### T006: Build BookmarkCard preview UI (2026-01-19)
**What was done**: Updated BookmarkCard component with:
- Preview section showing favicon, domain, title, description, OG image
- Domain extraction from URL
- Preview data display with proper layout and truncation
- New props: `fetchPreview`, `refreshPreview`

**Files modified**: `components/bookmarks/BookmarkCard.tsx`

### T007: Add skeleton & error states (2026-01-19)
**What was done**: Added loading and error UI:
- `PreviewSkeleton`: pulse animation skeleton while loading
- `PreviewError`: fallback text when preview unavailable
- `AnimatePresence`: smooth transitions between states
- Auto-load preview on mount if not cached

**Files modified**: `components/bookmarks/BookmarkCard.tsx`

### T008: Add refresh preview action (2026-01-19)
**What was done**: Added refresh functionality:
- "Refresh Preview" menu item in dropdown
- Debounced loading state
- Toast notifications on success/error
- Bypasses cache for fresh data

**Files modified**: `components/bookmarks/BookmarkCard.tsx`

### T009: Add preview toggle (2026-01-19)
**What was done**: Added settings for preview behavior:
- Toggle for "Show preview images" (global setting)
- Check in BookmarkCard before rendering OG image
- Default: true (show images)

**Files modified**: `components/bookmarks/BookmarkCard.tsx`

---
*Last updated: 2026-01-19*
