---
title: E2E Cloud Sync Epic — Clerk + Neon + Offline-Safe Sync
stack: Next.js (App Router) + Clerk + Neon Postgres + TypeScript
scope: optional E2E vault + per-record sync + offline queue + conflict-safe sync
non_goals:
  - No plaintext bookmark fields on server
  - No server-side search over encrypted data
  - No collaboration/sharing
  - No realtime presence
---

# EPIC: Optional E2E Vault + Cloud Sync (Amazing: Use Anywhere, Trust Forever)

## Epic Goal
Add an optional **E2E Vault Mode** that users can turn on:
- Sign in with Google via **Clerk**
- Encrypt **everything** client-side (E2E)
- Sync across devices via **Neon Postgres**
- Works offline with automatic recovery
- Conflict-safe: **keep both copies** (no silent data loss)

## Decisions (Locked)
- Auth: **Clerk**
- DB: **Neon Postgres**
- Sync granularity: **per-bookmark record**
- Conflict policy: **keep both** (create conflict duplicate)
- Key UX: user enables E2E explicitly; when enabled, vault unlock is remembered **until browser closes**
- Encryption scope: **encrypt everything** (title/url/description/tags/spaces/etc.)

---

## Definition of Done
- Settings screen includes:
  - Toggle: Enable E2E Vault Mode
  - Lock/Unlock controls (session-based)
  - Device indicator (optional)
- Enabling E2E:
  - Migrates existing local bookmarks into encrypted vault
  - Uploads encrypted records to server
  - Future edits sync automatically
- Offline behavior:
  - Local changes are queued in an outbox
  - Sync resumes automatically when online
- Conflicts:
  - No last-write-wins
  - Conflict creates a second record (“Conflict copy”) so both versions remain
- Disabling E2E:
  - Clear UX: either keep encrypted cloud data but stop syncing, OR decrypt back to local-only (user choice)

---

## Key UX Flow (Enable E2E)

### Step 1) User enables “E2E Vault Mode”
- Explain: passphrase is required to unlock; server cannot read data.

### Step 2) Choose passphrase
- Derive a wrapping key (KDF params stored).
- Generate a random vault key (32 bytes).
- Encrypt (wrap) the vault key with the passphrase-derived key.

### Step 3) Migrate local data + start sync
Two locations exist and both must be handled:
- **Local device** (existing localStorage bookmarks)
- **Cloud** (Neon)

Recommended migration sequence:
1) Read current local bookmarks (plaintext)
2) Convert each bookmark into an encrypted record (AES-GCM)
3) Store encrypted records locally (new storage key / new format)
4) Push encrypted records to server
5) Mark migration complete and stop reading old plaintext storage key

---

## Disabling E2E (What users usually like)
Provide a choice (clear warnings):
- **Option A (Recommended default): Stop syncing + keep cloud vault**
  - Pros: safest; no accidental data exposure; user can re-enable later
  - Cons: user might expect “back to normal” immediately
- **Option B: Decrypt back to local-only + optionally delete cloud vault**
  - Pros: matches expectation “turn off means turn off”
  - Cons: more risky UX; requires explicit confirmation; can expose data on shared machines

---

## Server Model (E2E-friendly)
Server stores only ciphertext + sync metadata.

### Tables (suggested)
- `users` (clerk_user_id)
- `devices` (device_id, user_id, last_seen_at)
- `records`
  - `record_id` (uuid)
  - `user_id`
  - `ciphertext` (bytea/text)
  - `version` (int)
  - `updated_at` (timestamp)
  - `deleted` (bool)

---

## Sync Protocol (Offline-safe)
- **Push**: `{ recordId, baseVersion, ciphertext, deleted }`
  - server accepts only if `baseVersion` matches current
- **Pull**: `sinceCursor` → returns changed records
- **Conflict**: server returns conflict on version mismatch
  - client creates a new recordId as “Conflict copy” and preserves both

---

## Task List (Agent-Friendly)
1) Integrate Clerk auth + protected routes
2) Add Settings UI for E2E toggle + lock state
3) Implement crypto helpers (KDF + AES-GCM) using WebCrypto
4) Add encrypted local storage format + migration from old localStorage
5) Add Neon schema + migrations
6) Add sync API routes (push/pull) protected by Clerk
7) Add client outbox queue + retry/backoff
8) Implement conflict handling (keep both) + basic UI surfacing
9) Update import/export to support E2E mode
10) Add tests: API route tests + client crypto unit tests (E2E optional)
