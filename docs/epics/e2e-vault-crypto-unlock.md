---
title: Epic — Vault Crypto + Unlock UX (PBKDF2)
stack: Next.js (App Router) + TypeScript + WebCrypto
scope: client-side key management + full-page unlock + vault enable UX
non_goals:
  - No full sync engine/outbox
  - No server-side search/indexing
---

# EPIC: Vault Crypto + Unlock Page

## Epic Goal
Make Vault Mode feel trustworthy and simple:
- User enables Vault Mode and sets a passphrase
- Vault is locked by default and requires unlock per browser session
- Encrypt/decrypt everything client-side using WebCrypto

## Decisions (Locked)
- KDF: PBKDF2 (simple first)
- Encryption: AES-GCM
- Unlock UX: full page (no bookmarks until unlocked)
- Unlock persistence: session-only (until browser closes)

## Definition of Done
- Crypto helpers exist:
  - derive wrapping key from passphrase (PBKDF2)
  - generate random vault key
  - wrap/unwrap vault key
  - encrypt/decrypt a bookmark record payload
- Full-page unlock route/screen exists:
  - clean UX, no hydration issues
  - lock/unlock state stored in memory or session-only state
- Enable Vault flow exists:
  - detects local + cloud presence
  - triggers merge + initial upload (actual upload handled by sync epic)

## Tasks (Short)
1) Implement crypto helpers (PBKDF2 + AES-GCM) with typed payload format
2) Add vault key envelope model (wrapped key + salt + params)
3) Create full-page Unlock screen + lock gate
4) Add Settings toggle to enable Vault Mode
5) Implement “enable vault” client flow (create envelope + prepare records)
6) Add unit tests for crypto roundtrip
