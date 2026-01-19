# T004: Update Storage Layer

**Phase**: Frontend (State)
**Status**: pending

## Summary
Add preview caching with stale policy to localStorage.

## Logic
Store preview data in localStorage alongside bookmarks. Implement TTL-based stale checking.

## Technical Logic
- Add `savePreviews` and `loadPreviews` functions
- Key: `bookmark-previews` in localStorage
- Stale policy: 7 days (604800000 ms)
- Merge strategy: overwrite with new data on fetch
- Handle storage quota errors gracefully

## Files
- `lib/storage.ts` - Add preview read/write functions

## Reference Pattern
- Existing `saveBookmarks`, `loadBookmarks` in `lib/storage.ts`
