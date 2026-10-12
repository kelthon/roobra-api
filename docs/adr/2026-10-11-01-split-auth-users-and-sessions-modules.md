---
status: Draft
intended-status: Accepted
date: 2026-10-11
recorded-at: 2026-10-12
source: 'design discussion on deleting accounts for issue #2, branch fix/GH-2-revoke-sessions-of-deleted-users'
supersedes:
superseded-by:
---

# Split Authentication, Users And Sessions Into Three Modules

## Context

`AuthModule` held everything about a user: the profile (`GET /auth/me`), the sign-in flows, the
password and email verification flows, and `AccessTokenService`, which owns `refresh_tokens` and is
the only user of `JwtService`.

Deleting an account needed a users module that revokes sessions. That module could not import
`AuthModule` for `AccessTokenService`: `AuthModule` will import the users module to create users at
registration, and the two imports form a cycle Nest only resolves with `forwardRef()`.

## Decision

Three modules, each the only writer of its tables, with dependencies in one direction:
`AuthModule` → `UsersModule` → `SessionsModule`, and `AuthModule` → `SessionsModule`.

- **`SessionsModule`** owns `refresh_tokens` and signs JWTs: `SessionsService` (formerly
  `AccessTokenService`) and the `JwtModule` configuration. It has no controller.
- **`UsersModule`** owns `users`: the profile (`GET /users/me`) and account deletion
  (`DELETE /users/me`).
- **`AuthModule`** keeps credentials and the flows that use them: register, login, password reset
  and change, email verification, with their token tables, the Passport strategies and the guards.
  The session routes stay under `/auth` and delegate to `SessionsService`.

`JwtStrategy`, which verifies access tokens, stays in `AuthModule` while `SessionsModule` signs them;
both read `jwt.secret`.

## Alternatives Considered

- **Users imports Auth, and Auth keeps writing `users`** — no refactor, but two modules would write
  the `users` table and registration could never use the users module without a cycle.
- **A cycle resolved with `forwardRef()`** — works, but the Nest documentation advises avoiding it,
  and it makes start-up errors and test setup harder.
- **Auth imports Users, and deletion emits an event Auth listens to** — no sessions module, but
  revoking would no longer share the deletion's transaction, and it needs
  `@nestjs/event-emitter`, which is not a dependency.

## Consequences

- Deletion and registration can revoke or create sessions inside their own transaction.
- `SessionsService.refresh` reads the user to sign the new token directly through Prisma: it cannot
  call `UsersService` without a cycle. It is the one read of `users` outside `UsersModule`.
- `GET /auth/me` became `GET /users/me`. No client used it.

## Implementation Status

Registration, login and the password and email flows still write `users` from `AuthService`. They
move to `UsersService` methods in a later change.
