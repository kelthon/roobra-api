import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { join } from 'node:path';

/**
 * Mirrors the `template`/`options` block of `MailerModule.forRootAsync` in
 * `src/app.module.ts` (dir, strict mode, partials, layout). Keep the two in
 * sync: this is what actually exercises Handlebars compilation, which
 * `*-mail.service.spec.ts` cannot do since it mocks `MailerService`.
 */
const mailerOptions = {
  template: {
    dir: import.meta.dirname,
    options: { strict: true },
  },
  options: {
    partials: {
      dir: join(import.meta.dirname, 'partials'),
      options: { strict: true },
    },
    layout: 'layouts/main',
  },
} as never;

function render(template: string, context: Record<string, unknown>): string {
  const adapter = new HandlebarsAdapter(undefined, {
    inlineCssEnabled: false,
  });
  const mail = { data: { template, context, html: '' } };
  let callbackError: Error | undefined;
  adapter.compile(
    mail,
    (err?: Error) => {
      callbackError = err;
    },
    mailerOptions,
  );
  if (callbackError) throw callbackError;
  return mail.data.html;
}

const layoutContext = {
  emailSubject: 'Subject',
  preheaderText: 'Preheader',
  appUrl: 'https://app.roobra.com',
};

describe('email templates render with real Handlebars', () => {
  it('renders verify-email with the context EmailVerificationMailService builds', () => {
    const html = render('locales/en/verify-email', {
      ...layoutContext,
      title: 'Verify your email address',
      username: 'john.doe',
      messageBody: 'Please confirm your email.',
      buttonText: 'Verify email',
      categoryBadge: 'Verification',
      verifyEmailUrl: 'https://app.roobra.com/verify-email/token',
      expiresInLabel: '48 hours',
    });

    expect(html).toContain('Verify email');
    expect(html).toContain('ROOBRA');
  });

  it('renders reset-password with the context PasswordResetMailService builds', () => {
    const html = render('locales/en/reset-password', {
      ...layoutContext,
      title: 'Reset your password',
      username: 'john.doe',
      messageBody: 'Click the button below to choose a new password.',
      buttonText: 'Reset password',
      categoryBadge: 'Security',
      resetPasswordUrl: 'https://app.roobra.com/reset-password/token',
      expiresIn: 15,
    });

    expect(html).toContain('Reset password');
    expect(html).toContain('ROOBRA');
  });

  it('renders create-password with a representative context', () => {
    const html = render('locales/en/create-password', {
      ...layoutContext,
      username: 'john.doe',
      createPasswordUrl: 'https://app.roobra.com/create-password/token',
      buttonText: 'Set Password',
    });

    expect(html).toContain('Set Password');
  });

  it('renders confirm-action with a representative context', () => {
    const html = render('locales/en/confirm-action', {
      ...layoutContext,
      username: 'john.doe',
      actionDescription: 'Change your email address',
      otpCode: '123456',
      confirmActionUrl: 'https://app.roobra.com/confirm-action/token',
      buttonText: 'Confirm Action',
    });

    expect(html).toContain('123456');
  });

  it('renders new-device with a representative context', () => {
    const html = render('locales/en/new-device', {
      ...layoutContext,
      username: 'john.doe',
      deviceName: 'iPhone 16',
      osName: 'iOS 19',
      browserName: 'Safari',
      locationCity: 'Lisbon',
      locationCountry: 'Portugal',
      loginTimestamp: '2026-09-22T10:00:00Z',
      ipAddress: '203.0.113.1',
      revokeSessionUrl: 'https://app.roobra.com/sessions/revoke/token',
    });

    expect(html).toContain('iPhone 16');
  });
});
