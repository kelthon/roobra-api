# Notifications Service Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `src/modules/notifications/` from its current hand-rolled
`MailProvider`/`SmtpMailProvider` (nodemailer, no template engine) to the
target architecture in the spec: `@nestjs-modules/mailer` + Handlebars, with
typed context wrappers for password reset and email verification.

**Architecture:** Register `MailerModule.forRootAsync` in
`notifications.module.ts` (SMTP transport from `mail.config.ts`, Handlebars
adapter, shared layout/partials). Each use case keeps a small service
(`PasswordResetMailService`, `EmailVerificationMailService`) that builds a
typed `context` object and calls `MailerService.sendMail`. The hand-rolled
`MailProvider` interface and `SmtpMailProvider` are deleted — per spec
§2.1 this is a deliberate, known trade-off (no transport-agnostic seam
anymore; `MailerService` is the transport layer).

**Tech Stack:** NestJS 11, `@nestjs-modules/mailer` 2.3.7, `nodemailer`
10.0.8, Handlebars 4.7.9, Jest 30 / ts-jest.

**Spec:** [docs/notifications-module-spec.md](../../notifications-module-spec.md)
(read §1–§5 and §8 before starting — §8 documents exactly the gap this plan
closes).

## Global Constraints

- Pin `@nestjs-modules/mailer` at exactly `2.3.7` and `nodemailer` at exactly
  `10.0.8` — already set in `package.json`, do not change the version.
- Do **not** pick a transport/provider (SES/Resend/Postmark). Generic SMTP
  via `mail.config.ts` stays the transport, per spec §2.3 — this is an open
  decision the team deferred explicitly, not an oversight.
- `EmailVerificationMailService` must **not** be wired into any controller
  or `AuthService` method. Per spec §5 there is no `EmailVerificationToken`
  model or `/verify-email` route yet — building the service only, not the
  endpoint, is correct scope for this plan.
- Keep `PasswordResetMailService.send(to, username, resetToken)`'s public
  signature unchanged — `AuthService.forgotPassword` already calls it and
  must not need modification.
- No MJML, no React Email, no BullMQ, no DB-backed templates (§6) — all
  explicitly out of scope.

---

## Current state (read before starting)

- `src/modules/notifications/interfaces/mail-provider.interface.ts` and
  `providers/smtp-mail.provider.ts` are the hand-rolled implementation being
  replaced.
- `services/email-verification-mail.service.ts` currently imports
  `renderEmailVerificationEmail` from `../templates/email-verification.template`
  — **that file does not exist on disk**. This service does not currently
  compile; it's mid-migration dead code.
- `interfaces/password-reset-context.interface.ts` and
  `interfaces/email-verification-context.interface.ts` are already stubbed
  as empty interfaces (`export default interface X {}`) — this plan fills
  them in, it doesn't create them.
- `.hbs` templates already exist and are usable as-is:
  `templates/layouts/main.hbs`, `templates/partials/footer.hbs`,
  `templates/partials/action-button.hbs`, `templates/reset-password.hbs`,
  `templates/verify-email.hbs`. This plan keeps these filenames — the spec's
  §3 diagram calls them `password-reset.hbs`/`email-verification.hbs`, but
  that's illustrative; renaming working templates buys nothing.
- `templates/create-password.hbs`, `templates/new-device.hbs`,
  `templates/confirm-action.hbs` exist but belong to use cases with no
  service/BR behind them yet. **Leave them untouched** — out of scope.
- `verify-email.hbs` line 29 has a real Handlebars bug that has never been
  caught because nothing compiles it today:
  `text=(#if buttonText buttonText "Verify Email")`. Handlebars subexpression
  syntax is `(helperName args...)` with **no** `#` — `#if` is only valid as
  a block helper (`{{#if}}...{{/if}}`), not inside `(...)`. This throws a
  parse error the first time this template is compiled. Task 2 fixes it
  with a test that exercises the real Handlebars compiler (a mocked
  `MailerService` would never catch this).

---

### Task 1: Remove the hand-rolled mail provider and add the missing dependency

**Files:**

- Delete: `src/modules/notifications/interfaces/mail-provider.interface.ts`
- Delete: `src/modules/notifications/providers/smtp-mail.provider.ts`
- Modify: `package.json`

**Interfaces:**

- Produces: nothing consumed by later tasks — this only clears the way.

- [ ] **Step 1: Delete the hand-rolled provider files**

```bash
git rm src/modules/notifications/interfaces/mail-provider.interface.ts
git rm src/modules/notifications/providers/smtp-mail.provider.ts
```

- [ ] **Step 2: Pin `handlebars` as an explicit dependency**

`handlebars` is currently only present as a transitive dependency (pulled in
by something else at `4.7.9`). `@nestjs-modules/mailer`'s `HandlebarsAdapter`
needs it as a real peer, so pin it explicitly. Add to `package.json`
`dependencies` (alphabetical, next to `dotenv`):

```json
    "handlebars": "^4.7.9",
```

- [ ] **Step 3: Install**

```bash
npm install
```

Expected: `node_modules/@nestjs-modules/mailer` and `node_modules/@css-inline`
now exist (the latter is `@nestjs-modules/mailer`'s CSS-inlining dependency,
pulled in transitively — do not add it to `package.json` yourself).

- [ ] **Step 4: Verify the build still fails only where expected**

```bash
npx tsc --noEmit -p tsconfig.json
```

Expected: errors in `services/email-verification-mail.service.ts` (missing
`../templates/email-verification.template`) and in
`notifications.module.ts` (references to the now-deleted
`mail-provider.interface`/`smtp-mail.provider`) — both are fixed by later
tasks. No other new errors should appear.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(notifications): pin handlebars, remove hand-rolled mail provider"
```

---

### Task 2: Fix the Handlebars subexpression bug in `verify-email.hbs`

**Files:**

- Modify: `src/modules/notifications/templates/verify-email.hbs:29`
- Test: `src/modules/notifications/templates/templates.spec.ts`

**Interfaces:**

- Produces: confidence that `verify-email.hbs` + `action-button.hbs` compile
  together under real Handlebars — Task 6 relies on this being fixed.

- [ ] **Step 1: Write the failing test (compiles the real template)**

Create `src/modules/notifications/templates/templates.spec.ts`:

```typescript
import { readFileSync } from 'fs';
import { join } from 'path';
import Handlebars from 'handlebars';

function loadTemplate(name: string): HandlebarsTemplateDelegate {
  const source = readFileSync(join(__dirname, `${name}.hbs`), 'utf8');
  return Handlebars.compile(source);
}

describe('notifications templates', () => {
  beforeAll(() => {
    const actionButton = readFileSync(
      join(__dirname, 'partials/action-button.hbs'),
      'utf8',
    );
    Handlebars.registerPartial('action-button', actionButton);
  });

  it('compiles and renders verify-email.hbs without a buttonText override', () => {
    const template = loadTemplate('verify-email');

    const html = template({
      username: 'Ada',
      verifyEmailUrl: 'https://roobra.com/verify-email?token=abc',
    });

    expect(html).toContain('Verify Email');
    expect(html).toContain('https://roobra.com/verify-email?token=abc');
  });

  it('compiles and renders verify-email.hbs with a buttonText override', () => {
    const template = loadTemplate('verify-email');

    const html = template({
      username: 'Ada',
      verifyEmailUrl: 'https://roobra.com/verify-email?token=abc',
      buttonText: 'Confirm my email',
    });

    expect(html).toContain('Confirm my email');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx jest src/modules/notifications/templates/templates.spec.ts
```

Expected: FAIL — Handlebars throws a parse error on
`(#if buttonText buttonText "Verify Email")` (something like `Parse error
... Expecting 'ID' ... got 'OPEN_SEXPR'` or similar, pointing at line 29).

- [ ] **Step 3: Fix the template**

In `src/modules/notifications/templates/verify-email.hbs`, replace line 29:

```hbs
      {{> action-button url=verifyEmailUrl text=(#if buttonText buttonText "Verify Email") isSecondary=false}}
```

with the correct subexpression form (`if`, no `#`, inside parens):

```hbs
      {{> action-button url=verifyEmailUrl text=(if buttonText buttonText "Verify Email") isSecondary=false}}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx jest src/modules/notifications/templates/templates.spec.ts
```

Expected: PASS (both cases).

- [ ] **Step 5: Commit**

```bash
git add src/modules/notifications/templates/verify-email.hbs src/modules/notifications/templates/templates.spec.ts
git commit -m "fix(notifications): fix invalid handlebars subexpression in verify-email template"
```

---

### Task 3: Register `MailerModule` in `notifications.module.ts`

**Files:**

- Modify: `src/modules/notifications/notifications.module.ts`

**Interfaces:**

- Consumes: `mail.config.ts` keys `mail.host`, `mail.port`, `mail.secure`,
  `mail.user`, `mail.password`, `mail.from` (all already defined and
  loaded globally via `AppModule`).
- Produces: `MailerService` (from `@nestjs-modules/mailer`) available for
  injection inside `NotificationsModule` — Tasks 4 and 5 inject it directly
  into `PasswordResetMailService`/`EmailVerificationMailService`. No local
  provider token is needed: `MailerModule.forRootAsync` exports
  `MailerService` itself, so any provider declared in a module that imports
  `MailerModule` can inject it without `NotificationsModule` re-exporting
  it explicitly.

- [ ] **Step 1: Rewrite the module**

Replace the full contents of
`src/modules/notifications/notifications.module.ts`:

```typescript
import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { PasswordResetMailService } from './services/password-reset-mail.service';
import { EmailVerificationMailService } from './services/email-verification-mail.service';

@Module({
  imports: [
    ConfigModule,
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.getOrThrow<string>('mail.host'),
          port: configService.getOrThrow<number>('mail.port'),
          secure: configService.getOrThrow<boolean>('mail.secure'),
          auth: {
            user: configService.getOrThrow<string>('mail.user'),
            pass: configService.getOrThrow<string>('mail.password'),
          },
        },
        defaults: {
          from: configService.getOrThrow<string>('mail.from'),
        },
        template: {
          dir: join(__dirname, 'templates'),
          adapter: new HandlebarsAdapter(),
          options: {
            partials: {
              dir: join(__dirname, 'templates/partials'),
            },
            layout: 'layouts/main',
          },
        },
        preview: process.env.NODE_ENV !== 'production',
        verifyTransporters: true,
      }),
    }),
  ],
  providers: [PasswordResetMailService, EmailVerificationMailService],
  exports: [PasswordResetMailService, EmailVerificationMailService],
})
export class NotificationsModule {}
```

Note: this will not compile yet — `PasswordResetMailService` and
`EmailVerificationMailService` still reference the deleted `MAIL_PROVIDER`
token until Tasks 5 and 6 rewrite them. That's expected at this point.

- [ ] **Step 2: Make templates survive the build**

`nest-cli.json` has no `assets` entry, so `tsc`/`nest build` only copies
`.ts` files — the `.hbs` files would silently be missing from `dist` in a
production build. Update `nest-cli.json`:

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true,
    "assets": [
      {
        "include": "modules/notifications/templates/**/*.hbs",
        "outDir": "dist"
      }
    ],
    "watchAssets": true
  }
}
```

- [ ] **Step 3: Verify the templates get copied**

```bash
npx nest build
find dist/modules/notifications/templates -name "*.hbs"
```

Expected: the same 8 `.hbs` files listed under `dist/modules/notifications/templates/`.

- [ ] **Step 4: Commit**

```bash
git add src/modules/notifications/notifications.module.ts nest-cli.json
git commit -m "feat(notifications): register MailerModule with handlebars adapter"
```

(This commit intentionally leaves the module non-compiling until Tasks 5–6
land — if your workflow requires green-at-every-commit, squash Tasks 3–6
before pushing; the step-by-step commits here exist for reviewability.)

---

### Task 4: Type the password reset context and rewrite `PasswordResetMailService`

**Files:**

- Modify: `src/modules/notifications/interfaces/password-reset-context.interface.ts`
- Modify: `src/modules/notifications/services/password-reset-mail.service.ts`
- Test: `src/modules/notifications/services/password-reset-mail.service.spec.ts`

**Interfaces:**

- Consumes: `MailerService.sendMail(options): Promise<any>` from
  `@nestjs-modules/mailer`; `ConfigService.getOrThrow<T>(path)`.
- Produces: `PasswordResetMailService.send(to: string, username: string,
  resetToken: string): Promise<void>` — signature unchanged, still what
  `AuthService.forgotPassword` (`src/modules/auth/auth.service.ts:232`)
  calls; no change needed there.

- [ ] **Step 1: Write the context interface**

Replace `src/modules/notifications/interfaces/password-reset-context.interface.ts`:

```typescript
export default interface PasswordResetContext {
  emailSubject: string;
  appUrl: string;
  preheaderText: string;
  categoryBadge: string;
  title: string;
  username: string;
  messageBody: string;
  resetPasswordUrl: string;
  buttonText: string;
  expiresIn: number;
}
```

(Every field here has no fallback in `layouts/main.hbs` or
`templates/reset-password.hbs` — omitting one renders a blank in the real
email, so all are required rather than optional.)

- [ ] **Step 2: Write the failing test**

Create `src/modules/notifications/services/password-reset-mail.service.spec.ts`:

```typescript
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { PasswordResetMailService } from './password-reset-mail.service';

describe('PasswordResetMailService', () => {
  let mailerServiceMock: MailerService;
  let configServiceMock: ConfigService;
  let service: PasswordResetMailService;

  beforeEach(() => {
    mailerServiceMock = {
      sendMail: jest.fn().mockResolvedValue(undefined),
    } as unknown as MailerService;

    configServiceMock = {
      getOrThrow: jest.fn((propertyPath: string) => {
        const values: Record<string, unknown> = {
          'app.frontendUrl': 'https://roobra.com',
        };
        return values[propertyPath];
      }),
    } as unknown as ConfigService;

    service = new PasswordResetMailService(mailerServiceMock, configServiceMock);
  });

  it('sends the password reset email with the reset link and expiry in minutes', async () => {
    await service.send('ada@roobra.com', 'ada', 'raw-token', 300);

    expect(mailerServiceMock.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'ada@roobra.com',
        template: 'reset-password',
        context: expect.objectContaining({
          username: 'ada',
          resetPasswordUrl: 'https://roobra.com/reset-password?token=raw-token',
          expiresIn: 5,
        }),
      }),
    );
  });
});
```

Note the signature grows a 4th parameter (`expiresInSeconds`) — the current
implementation reads `passwordResetToken.expiresIn` itself via
`ConfigService`, which duplicates a value `AuthService.forgotPassword`
already computed. Passing it in is a cleaner seam and keeps this service
free of a dependency on `AuthModule`'s token config key. Task 4 Step 5
updates the one caller.

- [ ] **Step 3: Run the test to verify it fails**

```bash
npx jest src/modules/notifications/services/password-reset-mail.service.spec.ts
```

Expected: FAIL — current constructor takes `(mailProvider, configService)`
via `@Inject(MAIL_PROVIDER)`, and the module doesn't compile yet.

- [ ] **Step 4: Rewrite the service**

Replace `src/modules/notifications/services/password-reset-mail.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import PasswordResetContext from '../interfaces/password-reset-context.interface';

@Injectable()
export class PasswordResetMailService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Sends the password reset email with a link back to the frontend.
   *
   * @param to The recipient email
   * @param username The recipient username, used for the greeting
   * @param resetToken The raw (unhashed) reset token to embed in the link
   * @param expiresInSeconds How long the token is valid for
   */
  async send(
    to: string,
    username: string,
    resetToken: string,
    expiresInSeconds: number,
  ): Promise<void> {
    const frontendUrl = this.configService.getOrThrow<string>('app.frontendUrl');

    const context = {
      emailSubject: 'Reset your Roobra password',
      appUrl: frontendUrl,
      preheaderText: 'Use this link to reset your password.',
      categoryBadge: 'Security',
      title: 'Reset your password',
      username: username,
      messageBody:
        'We received a request to reset your password. Click the button below to choose a new one.',
      resetPasswordUrl: `${frontendUrl}/reset-password?token=${resetToken}`,
      buttonText: 'Reset password',
      expiresIn: Math.round(expiresInSeconds / 60),
    } satisfies PasswordResetContext;

    await this.mailerService.sendMail({
      to,
      subject: context.emailSubject,
      template: 'reset-password',
      context,
    });
  }
}
```

- [ ] **Step 5: Update the one caller**

In `src/modules/auth/auth.service.ts`, `forgotPassword` already computes
`this.configService.getOrThrow<number>('passwordResetToken.expiresIn')` for
the `PasswordResetToken` row's `expiresAt`. Reuse that value instead of
computing it twice — change the call at `src/modules/auth/auth.service.ts:232`:

```typescript
      await this.passwordResetMailService.send(
        user.email,
        user.username,
        token,
      );
```

to:

```typescript
      await this.passwordResetMailService.send(
        user.email,
        user.username,
        token,
        this.configService.getOrThrow<number>('passwordResetToken.expiresIn'),
      );
```

(`expiresInSeconds` was already computed a few lines above this call, in
the `passwordResetToken.create` block — reuse that local rather than
calling `getOrThrow` a second time if you'd rather hoist it into a
variable; either is fine, the test in Task 4 Step 2 only asserts on the
`PasswordResetMailService` call.)

- [ ] **Step 6: Run the test to verify it passes**

```bash
npx jest src/modules/notifications/services/password-reset-mail.service.spec.ts
```

Expected: PASS.

- [ ] **Step 7: Run the full auth test suite (regression check)**

```bash
npx jest src/modules/auth
```

Expected: PASS. `auth.service.spec.ts` mocks `PasswordResetMailService`
directly (`passwordResetMailServiceMock = { send: jest.fn() }`), so it
isn't sensitive to the constructor change, only to the call in Step 5 — if
it fails, check the `forgotPassword` test's assertion on
`passwordResetMailServiceMock.send` arguments and update it to expect the
4th argument.

- [ ] **Step 8: Commit**

```bash
git add src/modules/notifications/interfaces/password-reset-context.interface.ts \
        src/modules/notifications/services/password-reset-mail.service.ts \
        src/modules/notifications/services/password-reset-mail.service.spec.ts \
        src/modules/auth/auth.service.ts src/modules/auth/auth.service.spec.ts
git commit -m "feat(notifications): rewrite PasswordResetMailService on MailerService"
```

---

### Task 5: Type the email verification context and rewrite `EmailVerificationMailService`

**Files:**

- Modify: `src/modules/notifications/interfaces/email-verification-context.interface.ts`
- Modify: `src/modules/notifications/services/email-verification-mail.service.ts`
- Test: `src/modules/notifications/services/email-verification-mail.service.spec.ts`

**Interfaces:**

- Consumes: same `MailerService`/`ConfigService` shape as Task 4.
- Produces: `EmailVerificationMailService.send(to: string, username: string,
  verificationToken: string, expiresInSeconds: number): Promise<void>` —
  **not called from anywhere yet**, per spec §5 (no
  `EmailVerificationToken` model / `/verify-email` route exist). Do not add
  a caller in this task.

- [ ] **Step 1: Write the context interface**

Replace `src/modules/notifications/interfaces/email-verification-context.interface.ts`:

```typescript
export default interface EmailVerificationContext {
  emailSubject: string;
  appUrl: string;
  preheaderText: string;
  categoryBadge: string;
  title: string;
  username: string;
  messageBody: string;
  verifyEmailUrl: string;
  buttonText: string;
  expiresIn: number;
}
```

- [ ] **Step 2: Write the failing test**

Create `src/modules/notifications/services/email-verification-mail.service.spec.ts`:

```typescript
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { EmailVerificationMailService } from './email-verification-mail.service';

describe('EmailVerificationMailService', () => {
  let mailerServiceMock: MailerService;
  let configServiceMock: ConfigService;
  let service: EmailVerificationMailService;

  beforeEach(() => {
    mailerServiceMock = {
      sendMail: jest.fn().mockResolvedValue(undefined),
    } as unknown as MailerService;

    configServiceMock = {
      getOrThrow: jest.fn((propertyPath: string) => {
        const values: Record<string, unknown> = {
          'app.frontendUrl': 'https://roobra.com',
        };
        return values[propertyPath];
      }),
    } as unknown as ConfigService;

    service = new EmailVerificationMailService(mailerServiceMock, configServiceMock);
  });

  it('sends the email verification email with the verify link and expiry in hours', async () => {
    await service.send('ada@roobra.com', 'ada', 'raw-token', 172800);

    expect(mailerServiceMock.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'ada@roobra.com',
        template: 'verify-email',
        context: expect.objectContaining({
          username: 'ada',
          verifyEmailUrl: 'https://roobra.com/verify-email?token=raw-token',
          expiresIn: 48,
        }),
      }),
    );
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
npx jest src/modules/notifications/services/email-verification-mail.service.spec.ts
```

Expected: FAIL — current file imports the nonexistent
`../templates/email-verification.template`.

- [ ] **Step 4: Rewrite the service**

Replace `src/modules/notifications/services/email-verification-mail.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import EmailVerificationContext from '../interfaces/email-verification-context.interface';

/**
 * NOTE: not wired to any endpoint yet. Email verification (BR-012) still
 * needs its own token model + generate/consume flow on the auth side
 * (there is no `EmailVerificationToken`, unlike `PasswordResetToken`) —
 * see docs/notifications-module-spec.md §5. This service only covers the
 * sending half so that work can plug straight into it once the token flow
 * exists.
 */
@Injectable()
export class EmailVerificationMailService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * @param to The recipient email
   * @param username The recipient username, used for the greeting
   * @param verificationToken The raw (unhashed) verification token to embed in the link
   * @param expiresInSeconds How long the token is valid for
   */
  async send(
    to: string,
    username: string,
    verificationToken: string,
    expiresInSeconds: number,
  ): Promise<void> {
    const frontendUrl = this.configService.getOrThrow<string>('app.frontendUrl');

    const context = {
      emailSubject: 'Verify your Roobra email address',
      appUrl: frontendUrl,
      preheaderText: 'Confirm your email to finish setting up your account.',
      categoryBadge: 'Verification',
      title: 'Verify your email address',
      username: username,
      messageBody:
        'Please confirm that this is your email address by clicking the button below to activate your account.',
      verifyEmailUrl: `${frontendUrl}/verify-email?token=${verificationToken}`,
      buttonText: 'Verify email',
      expiresIn: Math.round(expiresInSeconds / 3600),
    } satisfies EmailVerificationContext;

    await this.mailerService.sendMail({
      to,
      subject: context.emailSubject,
      template: 'verify-email',
      context,
    });
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
npx jest src/modules/notifications/services/email-verification-mail.service.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/modules/notifications/interfaces/email-verification-context.interface.ts \
        src/modules/notifications/services/email-verification-mail.service.ts \
        src/modules/notifications/services/email-verification-mail.service.spec.ts
git commit -m "feat(notifications): rewrite EmailVerificationMailService on MailerService"
```

---

### Task 6: Full verification and boot smoke test

**Files:** none new — this task only runs checks.

- [ ] **Step 1: Typecheck the whole project**

```bash
npx tsc --noEmit -p tsconfig.json
```

Expected: no errors.

- [ ] **Step 2: Run the full test suite**

```bash
npx jest
```

Expected: all suites pass, including the four written/touched in this plan
(`templates.spec.ts`, `password-reset-mail.service.spec.ts`,
`email-verification-mail.service.spec.ts`, `auth.service.spec.ts`).

- [ ] **Step 3: Boot the app against local SMTP creds**

Set `EMAIL_HOST`/`EMAIL_PORT`/`EMAIL_USER`/`EMAIL_PASSWORD`/`EMAIL_FROM` in
`.env.development` (e.g. a free Mailtrap sandbox inbox) and
`FRONTEND_URL=http://localhost:5173`, then:

```bash
npm run start:dev
```

Expected: the app boots without throwing — `verifyTransporters: true`
means a bad SMTP credential fails fast here, at boot, rather than on the
first `POST /forgot-password`. If it throws, double check the four
`EMAIL_*` vars against the provider's SMTP (not API) credentials.

- [ ] **Step 4: Trigger a real send**

```bash
curl -X POST http://localhost:3000/forgot-password \
  -H 'Content-Type: application/json' \
  -d '{"email":"<a real user'\''s email in your dev DB>"}'
```

Expected: `200` with the existing "check your inbox" message, and — since
`NODE_ENV` is not `production` in dev — a browser tab opens automatically
(`preview: true`) showing the rendered `reset-password` email inside the
branded layout with a working "Reset password" button. Confirm the footer
and logo render too (they come from the layout/partials, not the
use-case template).

This step is manual and not committed — it's the final confirmation that
transport, template dir resolution, and partials/layout wiring actually
work end-to-end, which no unit test in Tasks 1–5 exercises (they all mock
`MailerService.sendMail`).
