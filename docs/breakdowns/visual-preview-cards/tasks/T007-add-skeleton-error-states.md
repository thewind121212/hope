# T007: Add Skeleton & Error States

**Phase**: Frontend (UI)
**Status**: pending

## Summary
Add loading skeleton and fallback UI for preview when fetching or unavailable.

## Logic
Handle three states: loading, error, and empty/no-preview.

## Technical Logic
- Skeleton: Pulse animation during preview fetch
- Error: Show minimal placeholder with "Preview unavailable" text
- Empty: Show subtle "No preview" state or hide preview section
- Use `AnimatePresence` + `motion.div` for smooth transitions
- Prevent UI freeze on slow fetches

## Files
- `components/bookmarks/BookmarkCard.tsx` - Add loading/error states

## Reference Pattern
- Existing Framer Motion patterns in modals
- Skeleton patterns from `components/ui/Skeleton.tsx` (if exists)
