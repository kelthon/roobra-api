# How To Add An Email Template

## Objective

Add a new transactional email, or a new language for an existing one, to the notifications module.

## Prerequisites

- Read [the notifications reference](../reference/notifications-module.md) for the folder layout.
- The email is a transactional one (account or security related). Marketing content that non-developers
  should edit is a different feature, see
  [the marketing templates ADR](../adr/2026-09-12-marketing-email-templates-db-backed-marketing-only.md).

## Steps

### Add A New Email

1. Create the template at
   `src/modules/notifications/templates/locales/en/<template-name>.hbs`. Reuse the shared partials
   (`{{> action-button url=... text=... isSecondary=false}}`) and do not copy layout or footer markup.
2. Create `src/modules/notifications/services/<name>-mail.service.ts`, modelled on
   `password-reset-mail.service.ts`: inject `MailerService` and `ConfigService`, build a `context` with
   every variable the template uses, and call `sendMail({ to, subject, template, locale, context })`.
   Take `locale: LocaleType = 'en'` as the last parameter. Build links from
   `configService.getOrThrow('app.frontendUrl')`.
3. Register the service in `providers` and `exports` of `notifications.module.ts`.
4. Inject it where the email is triggered and `await` the send, following
   [the synchronous sending ADR](../adr/2026-09-11-05-send-transactional-email-synchronously.md).
5. Add `<name>-mail.service.spec.ts` next to it, modelled on
   `password-reset-mail.service.spec.ts`.

### Add A New Language

1. Add the tag to `LocaleType` in `src/shared/types/locale.type.ts` and to `SUPPORTED_LOCALES` in
   `src/common/utils/locale.util.ts`.
2. Create `src/modules/notifications/templates/locales/<tag>/` with a translation of each template.
   Any template missing there falls back to the default locale (`en`).
3. Pass any locale-specific text that lives in the shared layout or footer through `context` instead
   of forking the partial.

## Notes

- Templates run with Handlebars `strict: true`: a variable used in a template but absent from
  `context` makes the send fail.
- `nest-cli.json` copies `**/*.hbs` into `dist/` at build time; no extra step is needed.
- Outside production, the mailer opens each rendered email in a browser tab (`preview`). That is
  expected when you trigger a send locally.
- Run the checks in [how to run tests](./how-to-run-tests.md) before opening a pull request.
