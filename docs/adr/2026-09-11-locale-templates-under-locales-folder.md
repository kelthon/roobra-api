---
status: Draft
intended-status: Accepted
date: 2026-09-11
recorded-at: 2026-09-18
source: docs/notifications-module-spec.md §2.5; src/app.module.ts; src/modules/notifications/templates/ — the legacy doc cited first was removed in the docs restructuring (see git history)
supersedes:
superseded-by:
---

# Keep Layouts And Partials Shared, And Put Locale-Specific Templates Under `locales/<locale>/`

## Context

Emails must be available in more than one language. In `@nestjs-modules/mailer` 2.3.7 the Handlebars
layout is a single fixed value read once from the module config, and partials are registered once at
boot from a glob, keyed by their relative path. Duplicating layouts and partials per locale would
either need several adapter instances or hand-rolled rendering.

## Decision

1. Only the leaf use-case templates vary by locale, under
   `src/modules/notifications/templates/locales/<locale>/` (for example `locales/en/reset-password.hbs`).
2. `templates/layouts/` and `templates/partials/` stay locale-agnostic and shared.
3. Text that differs by locale but lives in shared layout or partials is passed through the
   `context` (for example `footerDisclaimer`), not as a per-locale partial.
4. Locale selection uses the library's built-in `i18n` option in `MailerModule.forRootAsync`:
   `defaultLocale: 'en'`, `templateDirPattern: 'locales/{{locale}}/'`, `fallback: true`. Callers pass
   `locale` to `sendMail`, and a missing locale folder falls back to the default.
5. Supported locale tags are `'en' | 'pt'` (`LocaleType`). `resolveLocale` maps a region tag such as
   `pt-BR` or `en-GB` to its primary subtag.

## Alternatives Considered

- **Locale folders flat under `templates/`** — equivalent for the library; rejected for tidiness
  only: one `locales/` parent keeps the top level to three concerns (`layouts/`, `partials/`,
  `locales/`).
- **Full per-locale duplication of layouts and partials** — rejected: unsupported without working
  around the library, and reintroduces drift where a design fix lands in one locale's copy only.

## Consequences

- Adding a language means adding a `locales/<tag>/` folder and the tag to `LocaleType` and
  `SUPPORTED_LOCALES`; no migration and no library change.
- Chrome (layout, footer, unsubscribe links) stays code-owned even if content becomes editable
  later (see [the marketing templates ADR](./2026-09-12-marketing-email-templates-db-backed-marketing-only.md)).

## Implementation Status

The as-built implementation differs from the original spec: the spec proposed `templates/locale/`
(singular), tags such as `pt-BR`, and a locale segment in the template path. The code uses
`templates/locales/` with the built-in `i18n` option and primary-subtag tags. Only `locales/en/`
has templates on this branch, so `pt` currently resolves through `fallback` to English. Whether
`pt` or `pt-BR` is the intended tag is for the reviewer to confirm.
