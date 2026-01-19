---
title: Epic — Vault Auth + Neon Foundations
stack: Next.js (App Router) + TypeScript + Clerk + Neon Postgres
scope: auth, DB schema, protected sync API skeleton
non_goals:
  - No encryption implementation
  - No client sync engine
  - No conflict UI
---

# EPIC: Vault Foundations (Auth + DB + API)

## Epic Goal
Establish the server-side foundation for Vault Mode:
- Google login via Clerk
- Neon Postgres schema for vault + records
- Protected API routes (push/pull skeletons) that work on Vercel

## Definition of Done
- Clerk is integrated (sign-in/out, middleware protection)
- Neon connection works from Next.js route handlers
- DB schema exists for:
  - vault config (key envelope metadata, enabled flag)
  - encrypted records (ciphertext + version + tombstones)
- API routes exist (even if crypto payload is mocked for now):
  - `GET /api/vault`
  - `POST /api/vault/enable`
  - `POST /api/sync/push`
  - `GET /api/sync/pull`
- All vault/sync routes require an authenticated Clerk session

## Env / Secrets (Required)
Add these to `.env.local` (never commit; `.env*` is already ignored by `.gitignore`).

### Clerk
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

Optional (recommended for stable redirects):
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/`

### Neon Postgres
- `DATABASE_URL` (Neon connection string)

Notes:
- Use Vercel project env vars for production.
- Prefer Neon/Vercel serverless-friendly connection pooling.

## Core Design (Server)
- Server stores **ciphertext only** (no plaintext bookmark fields)
- Per-record optimistic concurrency:
  - accept push only if `baseVersion === currentVersion`
  - otherwise return a conflict response

## Tasks (Short)
1) Add Clerk setup + protected routes
2) Add Neon DB access layer (pooling-safe for Vercel)
3) Create tables + migrations (`vaults`, `records`, optional `devices`)
4) Implement vault API (`/api/vault`, `/api/vault/enable`)
5) Implement sync API skeleton (`/api/sync/push`, `/api/sync/pull`)
6) Add API unit tests for version rules
