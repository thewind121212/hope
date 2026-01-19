---
title: Epic — Vault Sync Engine + Encrypted Backup
stack: Next.js (App Router) + TypeScript + localStorage + Neon API
scope: per-record auto sync, offline outbox, conflicts, encrypted import/export
non_goals:
  - No realtime collaboration
  - No server-side merging of encrypted fields
---

# EPIC: Vault Sync + Offline + Encrypted Import/Export

## Epic Goal
Deliver the “wow”:
- Sync across devices automatically
- Works offline (queue changes, retry later)
- Never loses data during conflicts
- Encrypted import/export when vault enabled

## Decisions (Locked)
- Sync granularity: per-bookmark record
- Conflict policy: keep both (create conflict duplicate)
- Offline behavior: outbox queue in local storage

## Definition of Done
- Client sync engine exists:
  - push local outbox
  - pull remote changes
  - runs automatically on unlock + periodically + on reconnect
- Outbox is durable (localStorage)
- Merge logic:
  - same recordId uses version compare
  - conflict response creates a new “Conflict copy” record
- Encrypted backup:
  - Export produces an encrypted file format (not plaintext JSON)
  - Import accepts encrypted file + passphrase and merges safely

## Tasks (Short)
1) Define encrypted record format + cursor strategy
2) Implement local outbox queue + retry/backoff
3) Implement push/pull client calls + merging
4) Implement conflict handling (keep both) + minimal UI surfacing
5) Implement encrypted export/import format
6) Add unit tests for outbox + merge + conflict
