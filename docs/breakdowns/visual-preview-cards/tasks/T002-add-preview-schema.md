# T002: Add PreviewSchema

**Phase**: Backend (Validation)
**Status**: pending

## Summary
Create Zod schema for preview data validation.

## Logic
Validate preview data before storing in localStorage.

## Technical Logic
- Create `PreviewSchema` in `lib/validation.ts`
- All fields optional to allow partial updates
- Validate URL formats for `faviconUrl` and `ogImageUrl`
- Validate `lastFetchedAt` as number (Unix timestamp)

## Files
- `lib/validation.ts` - Add PreviewSchema

## Reference Pattern
- Existing `BookmarkSchema` in `lib/validation.ts`
