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

Five fields exist only so the app can compare a secret, never so it can read one back:
`User.hashedPassword`, `RefreshToken.hashedToken`, `PasswordResetToken.hashedToken`,
`EmailVerificationToken.hashedToken` and `Key.hashedKey`. Without an explicit `select`, any plain `findUnique`/`findMany` returns them, and
nothing stops a future `return user` in a controller from leaking a hash in a JSON response.

## Decision

`PrismaService` passes Prisma Client's `omit` option once, at construction:

```ts
omit: {
  user: { hashedPassword: true },
  refreshToken: { hashedToken: true },
  passwordResetToken: { hashedToken: true },
  emailVerificationToken: { hashedToken: true },
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
- `EmailVerificationToken.hashedToken` was missing from the list when the model was introduced
  (migration `20260915005934`) and was added in commit `3a6e350`, so every hashed token field
  is now omitted by default.

## Implementation Status

Implemented, including the `emailVerificationToken` entry. [prisma-global-config.md](../prisma-global-config.md)
§1 still describes this as missing and is stale on that point.
