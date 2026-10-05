# Notifications Module Reference

**Location:** `src/modules/notifications/` and the `MailerModule` registration in `src/app.module.ts` —
verified against branch `docs/restructure-documentation`, 2026-09-18.

Transactional email for `roobra-api`. It does not cover push notifications or WhatsApp; the broader
"notifications and background jobs" roadmap item is larger than this module.

## Structure

```txt
src/modules/notifications/
  notifications.module.ts          provides and exports the two mail services
  services/
    password-reset-mail.service.ts
    email-verification-mail.service.ts
  templates/
    layouts/main.hbs               shared shell, includes the footer partial
    partials/action-button.hbs, footer.hbs
    locales/en/                    confirm-action, create-password, new-device,
                                   reset-password, verify-email
```

`MailerModule.forRootAsync` lives in `src/app.module.ts`, not in `notifications.module.ts`.

## Mailer Configuration

| Option | Value |
| --- | --- |
| Transport | SMTP, transport name `smtp`, from `mail.host`, `mail.port`, `mail.secure`, `mail.user`, `mail.password` |
| `defaults.from` | `mail.from` |
| Template adapter | `HandlebarsAdapter` with `inlineCssEnabled: true` |
| Template and partial options | `strict: true` |
| Template directory | `src/modules/notifications/templates` |
| Partials directory | `templates/partials` |
| `i18n` | `defaultLocale: 'en'`, `templateDirPattern: 'locales/{{locale}}/'`, `fallback: true` |
| `preview` | Opens the rendered email in a browser when the app mode is not `production` |

`nest-cli.json` copies `**/*.hbs` into `dist/`.

## Mail Services

| Service | `send` parameters | Template | Link built from |
| --- | --- | --- | --- |
| `PasswordResetMailService` | `to`, `username`, `resetToken`, `locale = 'en'` | `reset-password` | `app.frontendUrl` + `/reset-password/<token>` |
| `EmailVerificationMailService` | `to`, `username`, `verificationToken`, `expiresInSeconds`, `locale = 'en'` | `verify-email` | `app.frontendUrl` + `/verify-email/<token>` |

Both call `MailerService.sendMail` with a typed-by-convention `context` and are invoked directly and
synchronously from `AuthService`.

## Locales

`LocaleType` is `'en' | 'pt'`. `resolveLocale(acceptLanguage)` in `src/common/utils/locale.util.ts`
picks the first supported tag (exact, then primary subtag) and falls back to `DEFAULT_LOCALE`
(`'en'`). Only `locales/en/` has templates; `pt` falls back to English.

## Configuration

| Key | Source | Default |
| --- | --- | --- |
| `mail.host` | `EMAIL_HOST` | `localhost` |
| `mail.port` | `EMAIL_PORT` | `587` |
| `mail.secure` | `EMAIL_PORT === 465` | derived |
| `mail.user`, `mail.password` | `EMAIL_USER`, `EMAIL_PASSWORD` | none, required at startup |
| `mail.from` | `EMAIL_FROM` | `"Roobra" <no-reply@roobra.com>` |
| `app.frontendUrl` | `FRONTEND_URL` | `http://localhost:5173` |

## Use Case Status

| Use case | Status |
| --- | --- |
| Password reset (BR-11) | Token creation, email and `POST /auth/reset-password` implemented |
| Email verification (BR-12) | `EmailVerificationToken` model, email, `GET` and `POST /auth/verify-email` implemented |
| Welcome, receipt, subscription-expiring | Not started; the templates `confirm-action`, `create-password` and `new-device` exist but no service sends them |
| Marketing templates in the database | Not built, see [the ADR](../adr/2026-09-12-marketing-email-templates-db-backed-marketing-only.md) |

## Decisions

- [Mailer library](../adr/2026-09-11-use-nestjs-modules-mailer-for-transactional-email.md)
- [Handlebars](../adr/2026-09-11-handlebars-as-email-template-engine.md)
- [Synchronous sending](../adr/2026-09-11-send-transactional-email-synchronously.md)
- [Locale folder structure](../adr/2026-09-11-locale-templates-under-locales-folder.md)
- [Preferred language column](../adr/2026-09-11-user-preferred-lang-column.md)
- [Transport provider (open)](../adr/2026-09-11-email-transport-provider.md)

## Known Issues Found While Documenting

These are code observations, not decisions. They are listed for the reviewer and are not fixed by
this documentation branch.

- `verify-email.hbs` renders `{{#if expiresIn}}{{expiresIn}}{{else}}48{{/if}} hours`.
  `EmailVerificationMailService` passes `Math.round(seconds / 3600)`, which is `0` for the
  15-minute token, so the email says the link is valid for **48 hours**.
- `verify-email.hbs` and `new-device.hbs` contain leftover `[cite: ...]` text in the email body.
- `create-password.hbs` and `confirm-action.hbs` use `(#if ...)` inside a subexpression, which is not
  valid Handlebars syntax. Nothing renders them yet.
- No `layout` option is set for the adapter and no template references `layouts/main`, so it is
  unclear how the shared layout is applied.
- The JSDoc on `EmailVerificationMailService` still says it is not wired to any endpoint.
