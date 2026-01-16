## Bookmark Vault

A Next.js 14 bookmark manager using App Router, TailwindCSS, and TypeScript.

## Tech Stack

-Next.js 14 with App Router
-TailwindCSS for styling
-TypeScript strict mode
-localStorage for persistence (client-side only)

## Code Standards

-Use functional components only
-All components using localStorage must be client components ("use client")
-Use Zod for validation
-Keep components under 100 lines

## File Structure

```
bookmark-vault/
├── app/                    # Next.js App Router
│   ├── favicon.ico
│   ├── globals.css         # Global styles + Tailwind
│   ├── layout.tsx          # Root layout with header
│   └── page.tsx            # Home page
├── components/             # Reusable UI components (to create)
├── lib/                    # Utilities and types (to create)
├── hooks/                  # Custom React hooks (to create)
├── public/                 # Static assets
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── .gitignore
├── CLAUDE.md               # Project instructions
├── eslint.config.mjs       # ESLint configuration
├── next.config.ts          # Next.js configuration
├── next-env.d.ts           # Next.js TypeScript declarations
├── package.json            # Dependencies and scripts
├── postcss.config.mjs      # PostCSS configuration
├── tailwind.config.ts      # TailwindCSS configuration
└── tsconfig.json           # TypeScript configuration (strict mode)
```

## Features

The app allows users to:
- Save new bookmarks with title, URL, description, and tags
- View all saved bookmarks in a list
- Search and filter bookmarks
- Delete bookmarks
- Persist data in localStorage (client-side only)

## Bookmark Properties

Each bookmark contains:
- Title
- URL
- Description
- Tags

## Project Scope

This is a 4-5 hour project that covers full-stack patterns (components, state, storage) without database setup overhead. The scope includes:
- Component scaffolding
- Iteration and refinement
- TailwindCSS styling
- Testing and refactoring
- Simple responsive layout

The scope is focused: CRUD operations for one entity (bookmarks). Nothing more.
