# T006: Build BookmarkCard Preview UI

**Phase**: Frontend (UI)
**Status**: pending

## Summary
Update BookmarkCard to display preview metadata (favicon, domain, title, description, OG image).

## Logic
Add preview section to the card component with proper layout and truncation.

## Technical Logic
- Favicon: `<img>` from `https://{hostname}/favicon.ico` or stored `faviconUrl`
- Domain: Extract from URL, display as text
- Title: Show `previewTitle` or fallback to `title`
- Description: Show `previewDescription` with 2-line clamp
- OG Image: Show `ogImageUrl` as thumbnail (max 120x120px)
- Use existing card layout patterns from `BookmarkCard`

## Files
- `components/bookmarks/BookmarkCard.tsx` - Add preview slots

## Reference Pattern
- Existing `BookmarkCard` component structure
- `components/ui/` for Image/Text primitives
