# T003: Create Link Preview API

**Phase**: Backend (API)
**Status**: pending

## Summary
Implement `/api/link-preview?url=` route handler to fetch and parse HTML metadata.

## Logic
Server-side fetch to avoid CORS issues. Parse OG meta tags and return preview data.

## Technical Logic
- Validate URL (allowlist, format check)
- Fetch HTML with strict limits (5s timeout, 1MB max)
- Parse: `og:title`, `og:description`, `og:image`, `twitter:card`, `twitter:image`, fallback to `<title>`
- Extract favicon via `/favicon.ico` or `<link rel="icon">`
- Return JSON with preview fields or error status

## Files
- `app/api/link-preview/route.ts` - New API route

## Reference Pattern
- Existing API routes in `app/api/` for structure
- `lib/validation.ts` for URL validation patterns
