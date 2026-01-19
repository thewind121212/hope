# T005: Extend useBookmarks

**Phase**: Frontend (State)
**Status**: pending

## Summary
Add preview actions (fetch, refresh, update) to the bookmarks reducer.

## Logic
Expose preview CRUD via context for components to use.

## Technical Logic
- Add `fetchPreview(bookmarkId, url)` action
- Add `refreshPreview(bookmarkId)` action
- Add `updatePreview(bookmarkId, previewData)` action
- Integrate with storage layer from T004
- Handle loading and error states
- Trigger toast notifications on success/failure

## Files
- `hooks/useBookmarks.ts` - Add preview actions and state

## Reference Pattern
- Existing `addBookmark`, `updateBookmark`, `deleteBookmark` actions
- Existing toast integration pattern
