# T009: Add Preview Toggle

**Phase**: Settings
**Status**: pending

## Summary
Add "Show preview images" toggle in settings to control OG image visibility.

## Logic
User preference to hide preview images for performance or reduced visual noise.

## Technical Logic
- Add `showPreviewImages` to settings state (localStorage)
- Toggle in existing settings UI or BookmarkToolbar
- BookmarkCard checks setting before rendering OG image
- Default: true (show images)

## Files
- `lib/storage.ts` - Add settings read/write
- `components/bookmarks/BookmarkToolbar.tsx` or `app/page.tsx` - Add toggle

## Reference Pattern
- Existing settings pattern in the app (if any)
- Toggle UI patterns from `components/ui/Select.tsx` or custom toggle
