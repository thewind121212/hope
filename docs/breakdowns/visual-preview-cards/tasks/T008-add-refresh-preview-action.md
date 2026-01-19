# T008: Add Refresh Preview Action

**Phase**: Frontend (UI)
**Status**: pending

## Summary
Add per-bookmark "Refresh preview" button to manually refetch preview data.

## Logic
User-triggered action to bypass stale cache and fetch fresh preview.

## Technical Logic
- Add refresh icon button to BookmarkCard (e.g., rotate arrow)
- Click triggers `refreshPreview(bookmarkId)` from T005
- Show loading state on button during fetch
- Toast confirmation on success
- Debounce to prevent spam clicking

## Files
- `components/bookmarks/BookmarkCard.tsx` - Add refresh button

## Reference Pattern
- Existing icon button patterns in `components/ui/Button.tsx`
- Toast patterns from `useBookmarks.ts`
