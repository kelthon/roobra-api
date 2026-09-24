---
status: Draft
intended-status: Accepted
date: 2026-09-11
recorded-at: 2026-09-18
source: docs/notifications-module-spec.md §2.6; prisma/models/auth.prisma; prisma/migrations/20260913195813_add_preferred_lang_column_to_user; src/common/utils/locale.util.ts — the legacy doc cited first was removed in the docs restructuring (see git history)
supersedes:
superseded-by:
---

# Store The Email Language In A Nullable `User.preferredLang`, Seeded Once From `Accept-Language`

## Context

Transactional emails need a language, and some future emails (subscription expiring, Sprint 4) will
be sent from background jobs with no HTTP request, so a per-request `Accept-Language` header is not
always available. A locale must also be an honest, storable preference.

## Decision

1. Add `preferredLang String? @map("preferred_lang") @db.VarChar(5)` to `User`.
2. It is **nullable with no default**, so "no preference captured yet" is a real state. A
   `NOT NULL DEFAULT 'en'` would decide every user's language without asking anyone, the same silent
   default the transport decision rejects.
3. It is `VarChar(5)`, not an enum and not `Char`: tags such as `en` and `pt-BR` vary in length, and a
   new language should cost a new template folder, not a migration to widen an enum.
4. At registration, `AuthService.register()` should parse `Accept-Language` once, validate it against
   the supported locales and store the match, or leave `null`. After that, the stored value is the
   single source of truth.
5. Existing users stay `null`; no backfill guesses their language. At send time `null`, or a stored
   value that is no longer supported, falls back to `DEFAULT_LOCALE` (`'en'`).

## Alternatives Considered

- **Only `Accept-Language` per request** — breaks for background-job emails and gives no way to
  express a preference. Kept only as the one-time seed.
- **`NOT NULL DEFAULT`** — rejected, see point 2.
- **Separate `UserPreference` table** — rejected as premature: nothing else models a user preference
  yet (YAGNI). Revisit when a second preference appears.
- **`Json?` preferences blob on `User`** — rejected: gives up Postgres typing and constraints for
  growth room the code does not need, on a value read on every send.

## Consequences

- The column is a plain, indexable value on a hot path.
- The supported-locale list and the templates folders must be kept in step.

## Implementation Status

**Partial.** The column and migration exist, and `resolveLocale` in `src/common/utils/locale.util.ts`
implements the header parsing. Nothing calls `resolveLocale` outside its own spec: `register()`
does not store `preferredLang`, and the mail services take a `locale` parameter that defaults to
`'en'` instead of reading `user.preferredLang`. The spec already classed that wiring as follow-up
work outside the notifications module.
