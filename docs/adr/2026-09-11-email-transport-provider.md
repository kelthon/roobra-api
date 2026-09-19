---
status: Draft
intended-status: Proposed
date: 2026-09-11
recorded-at: 2026-09-18
source: docs/notifications-module-spec.md §2.3; src/app.module.ts; src/config/mail.config.ts
supersedes:
superseded-by:
---

# Choose The Email Transport Provider (Open)

## Context

Generic SMTP through nodemailer is used as a placeholder. It works with Mailtrap or Ethereal
locally and with the SMTP interfaces of SES or Postmark. Configuration is `EMAIL_HOST`,
`EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD` and `EMAIL_FROM`. Generic SMTP does not address bounce
and complaint handling, DKIM/SPF or IP reputation.

## Decision

**None yet, on purpose.** On 2026-09-11 the team explicitly deferred the choice ("ainda não sei /
decidir depois"). An assumption made earlier in the same session was called out and corrected.
**Do not assume a provider; ask before implementing against one.** `roobra-docs`
`architecture/auth-flow.md` names "SES/Resend" in a sequence diagram, which is a signal and not a
decision.

## Alternatives Considered

- **Generic SMTP (current)** — placeholder only.
- **Resend, AWS SES (native SDK), Postmark** — undecided. A pure-HTTP provider with no SMTP interface
  would be the case where using `@nestjs-modules/mailer` becomes a real lock-in (see
  [the mailer ADR](./2026-09-11-use-nestjs-modules-mailer-for-transactional-email.md)).

## Consequences

- Decide before production traffic depends on deliverability.
- Until then, `mail.config.ts` and `app.module.ts` describe an SMTP transport named `smtp`.

## Implementation Status

Configuration reads `EMAIL_USER` and `EMAIL_PASSWORD` with `getOrThrow` and no default, so the app
does not start without them, even for a local session that never sends email.
