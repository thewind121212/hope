# Bookmark Vault

A fast, offline-first bookmark manager built with Next.js App Router.

## Features
- Add / edit / delete bookmarks with validation (Zod)
- Search + Tag + Sort filters
- Spaces (e.g. Personal/Work) + pinned views (saved filters)
- Bulk actions (select + delete)
- Link previews (favicon, title, description, OG image) + refresh
- Import/Export JSON
- Dark / Light / System theme

## Tech Stack
- Next.js (App Router) + React 19
- TypeScript (strict)
- TailwindCSS
- Zod
- localStorage persistence (client-side)

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Scripts
- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run start` — start production server
- `npm run test` — run Jest tests
- `npm run lint` — run ESLint

## Data & Storage
- Bookmarks and UI state persist in the browser using `localStorage`.
- There is no backend/database in this project.

## Import / Export
- Export downloads a JSON file of your bookmarks.
- Import supports merge/replace with duplicate handling.

## Notes
- Components that touch `window`, `document`, or `localStorage` are client components (`"use client"`).
- Link previews are fetched via `app/api/link-preview/route.ts`.
