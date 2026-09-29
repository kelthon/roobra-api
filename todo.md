# Todo

Issues found while verifying the docs against the code (2026-09-18/19). Temporary list until they become
issues or PRs. `[x]` means the fix is already in the working tree but uncommitted.

## P0: Broken Behavior

- [x] **`verify-email.hbs` cannot render.** Line 29 was `text=(if buttonText buttonText "Verify Email")`;
  now `text=buttonText`. Line 36 also had its own parse error, `{{#if expiresIn > 1}}` (inline comparison
  isn't valid Handlebars) plus a leftover `[cite: 1, 3]`; both removed, now `{{expiresIn}} hours`.
  - Added `src/modules/notifications/templates/render.spec.ts`, which renders every template through the
    real `HandlebarsAdapter` (mirroring the `app.module.ts` config) with a representative context, so a
    template syntax error fails the unit suite instead of only surfacing on a live send.
- [ ] **`sendVerificationEmail` creates the token and sends the email in one `Promise.all`**
  ([auth.service.ts:350](src/modules/auth/auth.service.ts#L350)). A link can be sent for a token that was not
  saved, and a failed send can leave a saved token. Await the insert first, then send, as `forgotPassword` does.
  See [send-transactional-email-synchronously](docs/adr/2026-09-11-05-send-transactional-email-synchronously.md).
- [x] Prisma query logging checked the undefined key `env`; now reads `app.mode`
  ([prisma.service.ts:14](src/modules/database/prisma.service.ts#L14)).
- [x] `emailVerificationToken.hashedToken` added to the global `omit`
  ([prisma.service.ts:29](src/modules/database/prisma.service.ts#L29)).
- [x] Email verification lifetime changed from 15 minutes to 48 hours
  ([email-verification-token.config.ts](src/config/email-verification-token.config.ts)), matching the email text.
  - [ ] **Neither TTL is a real decision.** Confirmed (2026-09-22): both the password reset 5-minute
    value and the email verification 48-hour value are test placeholders, not product-approved
    numbers. Pick real values before shipping. Tracked in
    [the tokens ADR](docs/adr/2026-09-11-01-one-time-opaque-tokens-for-reset-and-verification.md).

## P1: Wrong Or Missing Behavior

- [x] Remove the leftover `[cite: 1, 3]` in `verify-email.hbs:36` and `[cite: 4, 7]` in `new-device.hbs:49`.
- [ ] Wire `preferredLang`: `register()` should store `resolveLocale(acceptLanguage)`, and the mail services should
  read `user.preferredLang` instead of defaulting to `'en'`. Needs the `Accept-Language` header in
  `AuthController.register`. See [user-preferred-lang-column](docs/adr/2026-09-11-07-user-preferred-lang-column.md).
- [ ] `JwtStrategy.validate` accepts deleted or blocked users
  ([jwt.strategy.ts:17](src/modules/auth/strategies/jwt.strategy.ts#L17)).
- [x] `create-password.hbs:29` and `confirm-action.hbs:41` used `(#if ...)` (parse error); both now
  `text=buttonText`, same fix as `verify-email.hbs`. `new-device.hbs` still fails strict mode on a missing
  `deviceName` etc., but that's expected until a service sends it and builds that context — nothing to fix
  in the template itself.
- [x] The shared layout was never applied: no adapter `layout` option was set. Added
  `options.layout: 'layouts/main'` in `app.module.ts`. Verified via `render.spec.ts` (asserts the rendered
  HTML contains the layout's `ROOBRA` brand mark).
- [ ] **Mail services leak English copy through `context`, contradicting the locale-folder ADR.**
  `EmailVerificationMailService` and `PasswordResetMailService` pass `title`, `messageBody`, `buttonText`
  and `categoryBadge` as hardcoded English strings in `context`. Per
  [locale-templates-under-locales-folder](docs/adr/2026-09-11-06-locale-templates-under-locales-folder.md)
  (decision 3), only text living in the *shared* layout/partials should travel through `context`; text in
  a `locales/<tag>/*.hbs` leaf template should be hardcoded in that file, since the whole point of the
  locale folder is that each language gets its own copy of it. As-is, adding `locales/pt/verify-email.hbs`
  would still render the service's English `title`/`messageBody`/`buttonText` — the `{{#if title}}...
  {{else}}<hardcoded English>{{/if}}` fallback already in the templates is the correct pattern, but it's
  dead code today because the service always supplies the variable.
  - Fix: drop `title`, `messageBody`, `buttonText`, `categoryBadge` from the context built in both
    services; hardcode that copy directly in each `locales/en/*.hbs` (drop the now-unneeded `{{#if}}`
    wrapper around it) so the fallback becomes the only text.
  - Keep `preheaderText` and `emailSubject` as context variables — legitimate exception, they're consumed
    by the shared `layouts/main.hbs` and the SMTP envelope (`subject:`), neither of which is
    per-locale-duplicated.
  - Do this before adding real `pt` templates below, otherwise the same leak repeats per language.
- [ ] `templates/locales/pt/` exists but is empty, so `pt` falls back to English. Add translations or remove the tag
  from `LocaleType` until they exist.

## P2: Decisions And Cleanup

- [ ] Decide whether `forgotPassword` should keep answering "No user found" for unknown emails
  ([auth.service.ts:252](src/modules/auth/auth.service.ts#L252)); it reveals which emails are registered. `login`
  answers similarly at line 190.
- [ ] `.github/workflows/deploy.yml` does not deploy. Rename it (for example `ci.yml`, workflow name "CI") or add the
  deploy job. See [manual-deployment-via-script](docs/adr/2026-08-28-05-manual-deployment-via-script.md).
- [ ] `database.config.ts` reads `process.env.USER` for `database.user` (probably meant `DATABASE_USER`), and only
  `database.url` is used anywhere. Fix or remove the unused keys.
- [x] The JSDoc on `EmailVerificationMailService` (line 8) said it was not wired to any endpoint; removed
  (it is wired, from `auth.service.ts#sendVerificationEmail`).
- [x] `.github/instructions/*.md` linked to the old repository `kelthon/ph-docs` in 7 places across
  4 files; fixed to `kelthon/roobra-docs` (2026-09-22).
- [ ] **`UserRole.STAFF` looks vestigial — candidate for removal.** Cross-checked every RBAC surface
  in `roobra-docs` (`business/personas.md`, `architecture/auth-flow.md` §2, and
  `management/roadmaps/dashboard.md`'s own feature-by-feature "Access Control by Role" table and its
  "Staff Management" epic, which is the most granular permission doc that exists) — all of them
  recognize exactly 3 staff-facing roles (`ADMIN`, `CONTENT_MANAGER`, `SUPPORT_AGENT`) plus
  `SUBSCRIBER`. None mention a 4th generic staff role. In code, `UserRole.STAFF` is never read,
  written, or seeded — the only occurrence is a hand-written mock enum inside
  `roles.guard.spec.ts` used as an arbitrary second test value (not even importing the real enum).
  `prisma/seeds/02-users.seed.ts`'s `staff` variable actually has role `CONTENT_MANAGER`, not
  `STAFF` — the variable name is misleading, not evidence of real usage. Decide whether to drop
  `STAFF` from the `UserRole` enum (needs a migration) before more code accumulates around it.

## Docs To Update When The Fixes Above Are Committed

- [x] [Query logging ADR](docs/adr/2026-09-04-02-environment-based-prisma-query-logging.md): drop the "diverges from intent" section.
- [x] [Global omit ADR](docs/adr/2026-09-04-01-global-omit-for-credential-hashes.md): drop the `EmailVerificationToken` open point.
- [x] [One-time tokens ADR](docs/adr/2026-09-11-01-one-time-opaque-tokens-for-reset-and-verification.md) and
  [auth reference](docs/reference/auth-module.md): verification lifetime 15 minutes → 48 hours, and
  both TTLs flagged as undecided placeholders (2026-09-22).
- [x] [Notifications reference](docs/reference/notifications-module.md), "Known Issues": remove what is fixed.
- [ ] [Sync send ADR](docs/adr/2026-09-11-05-send-transactional-email-synchronously.md): update the Implementation Status.
- [x] [Migration plan](docs/superpowers/plans/2026-09-18-docs-restructure-migration.md), "Findings": remove what is fixed.
