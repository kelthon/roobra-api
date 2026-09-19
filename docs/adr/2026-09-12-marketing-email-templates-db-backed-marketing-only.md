---
status: Draft
intended-status: Accepted
date: 2026-09-12
recorded-at: 2026-09-18
source: docs/notifications-module-spec.md §9
supersedes:
superseded-by:
---

# Allow Database-Managed Templates For Marketing Email Only

## Context

The team sketched a `MarketingEmailTemplate` model while asking whether file-based templates would
limit a future content or marketing role that needs to change copy without a deploy. The model was
removed from the schema after the discussion, so the idea would not sit as unmigrated schema.

## Decision

1. **Marketing email only.** Only promotional content may become editable through a future admin
   dashboard and stored in the database.
2. **Never authentication or transactional email.** Password reset, email verification and any
   security- or account-critical email stay file-based and code-reviewed, permanently. A broken
   `{{resetUrl}}` in a database-edited template is a security incident, not a copy typo.
3. **Email-only model, not shared with WhatsApp.** An earlier draft used one `NotificationType` enum
   that matches Meta's WhatsApp template categories. WhatsApp templates need Meta pre-approval,
   numbered `{{1}}` placeholders and separate header, body, footer and button components, which is
   structurally incompatible with a free-text HTML `content` field.
4. **Chrome stays in code.** Branding shell, shared footer and the unsubscribe link (a compliance
   requirement) stay in the code-owned `templates/layouts/` and `templates/partials/`. Only the body
   `content` is database-driven, and a `layout` field picks among a few pre-approved code layouts.
5. **Missing variables must fail.** Compile with Handlebars `strict: true` so a renamed or missing
   variable fails the send instead of rendering blank. `previewVariables` only feeds dashboard
   previews and is not validated against the real send.
6. **Security boundary before shipping:** who can set `status: ACTIVE` or edit an active template is
   a gated permission, and no custom Handlebars helpers beyond a small reviewed allowlist (nothing
   that reaches the filesystem or network) may be registered for this content.

## Alternatives Considered

- **One model for email and WhatsApp templates** — rejected, see point 3.
- **Editable transactional templates** — rejected, see point 2.

## Consequences

- Implementing it requires a custom `TemplateResolver` for the mailer library, whose Handlebars
  adapter only reads templates from disk: fetch by `name` and `lang`, compile the string, wrap it in
  the shared layout and cache it so a campaign fanning out to many subscribers does not recompile per
  recipient.
- The draft schema (`TemplateStatus` enum, `MarketingEmailTemplate` with `@@unique([name, lang])`,
  nanoid primary key, `VarChar(5)` `lang`) is preserved in `docs/notifications-module-spec.md` §9.4
  until the feature is built.

## Implementation Status

**Not built.** No `MarketingEmailTemplate` model exists in `prisma/models/`.
