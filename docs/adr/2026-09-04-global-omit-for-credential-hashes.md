---
status: Draft
intended-status: Accepted
date: 2026-09-04
recorded-at: 2026-09-18
source: docs/prisma-global-config.md §1; src/modules/database/prisma.service.ts; commit 1126efd
supersedes:
superseded-by:
---

# Omit Credential Hashes Globally On The Prisma Client

## Context

Four fields exist only so the app can compare a secret, never so it can read one back:
`User.hashedPassword`, `RefreshToken.hashedToken`, `PasswordResetToken.hashedToken` and
`Key.hashedKey`. Without an explicit `select`, any plain `findUnique`/`findMany` returns them, and
nothing stops a future `return user` in a controller from leaking a hash in a JSON response.

## Decision

`PrismaService` passes Prisma Client's `omit` option once, at construction:

```ts
omit: {
  user: { hashedPassword: true },
  refreshToken: { hashedToken: true },
  passwordResetToken: { hashedToken: true },
  key: { hashedKey: true },
}
```

The keys are client accessor names (lowerCamelCase), not schema model names. A query that needs the
hash opts back in locally with `omit: { hashedPassword: false }`, as `AuthService.validateUser`
does. Queries with an explicit `select` are unaffected, and `where`/`data` are never affected
(`omit` only shapes what comes back).

## Alternatives Considered

- **Per-query `select` or `omit` at every call site** — rejected: it relies on every future
  developer remembering, which is the failure the decision exists to remove.

## Consequences

- Default results are safe; reading a hash is an explicit, greppable opt-in.
- `EmailVerificationToken.hashedToken` is **not** in the omit list. The model was added after the
  list was written (migration `20260915005934`). Whether it should be added is an open review
  point.

## Implementation Status

Implemented. [prisma-global-config.md](../prisma-global-config.md) §1 still describes this as
missing and is stale on that point.
