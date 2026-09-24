---
status: Draft
intended-status: Accepted
date: 2026-09-11
recorded-at: 2026-09-18
source: docs/notifications-module-spec.md §2.1; src/app.module.ts; package.json — the legacy doc cited first was removed in the docs restructuring (see git history)
supersedes:
superseded-by:
---

# Use `@nestjs-modules/mailer` For Transactional Email

## Context

Password recovery (BR-011) and email verification (BR-012) are P0 in `roobra-docs`
`management/mvp-summary.md` and need transactional email. A first pass hand-rolled a `MailProvider`
interface plus an SMTP provider over nodemailer, building HTML with template literals. It was
discarded during the 2026-09-11 design session.

## Decision

Use `@nestjs-modules/mailer` (built on nodemailer) instead of a custom abstraction. Versions are
pinned exactly in `package.json`: `@nestjs-modules/mailer` `2.3.7` and `nodemailer` `10.0.8`.

It provides what the hand-rolled version would have had to reimplement: CSS inlining, a dev-mode
browser preview, boot-time SMTP credential verification and template adapters. Its extra peer
dependencies (`mjml`, `ejs`, `pug`, `liquidjs`, `bullmq`, ...) are optional, so only the installed
engine (`handlebars`) is pulled in.

## Alternatives Considered

- **Custom `MailProvider` interface plus own nodemailer wiring** — built and discarded: reimplements
  the features above.
- **React Email** — rejected for now: it brings `react` and `react-dom` into an API repository that
  has no React, for typed props and component reuse that matter more once the email catalog is
  large. Revisit if the catalog grows a lot and the team accepts JSX in the backend.

## Consequences

- There is no transport-agnostic seam: `MailerService` is the transport layer. This was traded away
  knowingly. Nodemailer itself supports SMTP, SES, sendmail and streaming, so the cost is soft
  except for a pure-HTTP provider with no SMTP interface (see
  [the transport ADR](./2026-09-11-email-transport-provider.md)).
- Each use case keeps a small typed service (`PasswordResetMailService`,
  `EmailVerificationMailService`) that builds the `context` and calls `sendMail`, to recover
  compile-time type safety that `sendMail`'s `Record<string, any>` context gives up.

## Implementation Status

`MailerModule.forRootAsync` is registered in `src/app.module.ts`, not in `notifications.module.ts`
as the spec described. `NotificationsModule` only provides and exports the two mail services.
