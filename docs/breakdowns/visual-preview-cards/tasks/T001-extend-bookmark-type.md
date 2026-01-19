# T001: Extend BookmarkType

**Phase**: Backend (Types)
**Status**: pending

## Summary
Add optional preview fields to the Bookmark type definition.

## Logic
The Bookmark type needs to store:
- `faviconUrl`: string | null
- `siteName`: string | null
- `ogImageUrl`: string | null
- `previewTitle`: string | null
- `previewDescription`: string | null
- `lastFetchedAt`: number | null (Unix timestamp)

## Technical Logic
- Extend existing `Bookmark` interface in `lib/types.ts`
- All fields optional to support bookmarks created before this feature
- Use `string | null` for clarity (no undefined in storage)

## Files
- `lib/types.ts` - Add preview fields to Bookmark interface

## Reference Pattern
- Existing `Bookmark` interface structure in `lib/types.ts`
