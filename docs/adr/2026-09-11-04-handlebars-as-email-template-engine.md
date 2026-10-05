---
status: Draft
intended-status: Accepted
date: 2026-09-11
recorded-at: 2026-09-18
source: docs/notifications-module-spec.md §2.2; src/app.module.ts — the legacy doc cited first was removed in the docs restructuring (see git history)
supersedes:
superseded-by:
---

# Use Plain Handlebars As The Email Template Engine

## Context

`@nestjs-modules/mailer` supports Handlebars, EJS, Pug, Liquid and MJML adapters. Templates are
authored by the development team only.

## Decision

Use Handlebars directly, without MJML. The adapter is created with CSS inlining enabled, and both
template and partial compilation run with `strict: true`, so a missing variable throws instead of
rendering an empty string.

## Alternatives Considered

- **EJS** — rejected: embeds real JavaScript in templates, a higher risk of business logic leaking
  into markup than Handlebars' logic-less design.
- **Pug** — rejected: indentation syntax means a designer's HTML mockup needs manual translation, with
  no upside over Handlebars for this team.
- **Liquid** — rejected: the only adapter without built-in CSS inlining in this library (verified in
  its `liquid.adapter.js`), and its sandboxing benefit does not apply when only the team authors
  templates.
- **Handlebars plus MJML** — **deferred, not rejected.** MJML compiles to table-based HTML that
  fixes Outlook and old-client layout problems, a different problem from CSS inlining. The learning
  curve and mockup translation cost are not justified yet. Revisit when a real Outlook rendering bug
  is reported; swapping is additive because MJML wraps whichever sub-engine is already used.

## Consequences

- Designers' HTML can be dropped in with little translation.
- Old Outlook clients may render modern CSS layout badly until MJML is adopted.
- `strict: true` turns a template or context mismatch into a failed send, which is the behavior the
  spec (§9.5) asked to decide before building any marketing send path.
