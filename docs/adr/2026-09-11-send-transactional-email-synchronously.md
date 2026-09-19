---
status: Draft
intended-status: Accepted
date: 2026-09-11
recorded-at: 2026-09-18
source: docs/notifications-module-spec.md §2.4; src/modules/auth/auth.service.ts
supersedes:
superseded-by:
---

# Trigger Transactional Email With A Direct, Synchronous Call

## Context

`AuthModule` must send an email when a user requests a password reset or email verification.
`roobra-docs` `management/mvp-summary.md` §2.4 schedules background jobs (BullMQ) for Sprint 4
(P1), which depends on subscriptions (Sprint 3); neither exists in code yet. `REDIS_URL` is already
in `.env.example`.

## Decision

`AuthService` injects the mail services (`PasswordResetMailService`,
`EmailVerificationMailService`) and calls them directly, awaiting the send inside the request that
creates the token.

## Alternatives Considered

- **Domain events (`@nestjs/event-emitter`)** — lower coupling between `AuthModule` and
  `NotificationsModule`, but does not fix the resiliency gap by itself.
- **Queue (BullMQ)** — solves coupling and resiliency (retry, dead-letter, survives a crash).
  Rejected **for now**: building it today would be ahead of the roadmap's own sequencing, and the
  infrastructure cost to add later is low.

## Consequences

**Known, accepted gap:** if the send throws, `forgotPassword()` returns a 500 even though the
`PasswordResetToken` row was already committed; the two operations are not atomic. Acceptable at
current volume. If it becomes a support issue, the fixes are an event-based fire-and-forget send or,
more rigorously, an outbox (write the intent to send in the same transaction as the token, deliver
from a separate worker).

## Implementation Status

`forgotPassword` creates the token and then awaits the send. `sendVerificationEmail` runs the token
insert and the send **concurrently** in `Promise.all`, so an email can be sent with a link whose
token was not persisted, and a failed send can still leave a persisted token.
