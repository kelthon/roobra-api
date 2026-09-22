import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { join } from 'node:path';
import previewEmailImport from 'preview-email';

type PreviewEmailMessage = {
  from: string;
  to: string;
  subject: string;
  html: string;
};
const previewEmail = previewEmailImport as (
  message: PreviewEmailMessage,
) => Promise<unknown>;

/**
 * Renders a notification template with real Handlebars (same dir/strict/layout
 * config as `MailerModule.forRootAsync` in src/app.module.ts) and opens it in
 * the browser via `preview-email`, the same package the app uses for its own
 * automatic dev-mode preview. No SMTP or running app required.
 */

const TEMPLATES_DIR = join(__dirname, '../src/modules/notifications/templates');

const mailerOptions = {
  template: {
    dir: TEMPLATES_DIR,
    options: { strict: true },
  },
  options: {
    partials: {
      dir: join(TEMPLATES_DIR, 'partials'),
      options: { strict: true },
    },
    layout: 'layouts/main',
  },
} as never;

const layoutContext = {
  emailSubject: 'Preview',
  preheaderText: 'This is a local preview, no email was sent.',
  appUrl: 'https://app.roobra.com',
};

const SAMPLES: Record<
  string,
  { subject: string; context: Record<string, unknown> }
> = {
  'verify-email': {
    subject: 'Verify your Roobra email address',
    context: {
      ...layoutContext,
      title: 'Verify your email address',
      username: 'john.doe',
      messageBody:
        'Please confirm that this is your email address by clicking the button below to activate your account.',
      buttonText: 'Verify email',
      categoryBadge: 'Verification',
      verifyEmailUrl: 'https://app.roobra.com/verify-email/token',
      expiresInLabel: '48 hours',
    },
  },
  'reset-password': {
    subject: 'Reset your Roobra password',
    context: {
      ...layoutContext,
      title: 'Reset your password',
      username: 'john.doe',
      messageBody:
        'We received a request to reset your password. Click the button below to choose a new one.',
      buttonText: 'Reset password',
      categoryBadge: 'Security',
      resetPasswordUrl: 'https://app.roobra.com/reset-password/token',
      expiresIn: 15,
    },
  },
  'create-password': {
    subject: 'Set up your Roobra password',
    context: {
      ...layoutContext,
      username: 'john.doe',
      createPasswordUrl: 'https://app.roobra.com/create-password/token',
      buttonText: 'Set Password',
    },
  },
  'confirm-action': {
    subject: 'Confirm your Roobra request',
    context: {
      ...layoutContext,
      username: 'john.doe',
      actionDescription: 'Change your email address',
      otpCode: '123456',
      confirmActionUrl: 'https://app.roobra.com/confirm-action/token',
      buttonText: 'Confirm Action',
    },
  },
  'new-device': {
    subject: 'New sign-in detected',
    context: {
      ...layoutContext,
      username: 'john.doe',
      deviceName: 'iPhone 16',
      osName: 'iOS 19',
      browserName: 'Safari',
      locationCity: 'Lisbon',
      locationCountry: 'Portugal',
      loginTimestamp: '2026-09-22 10:00 UTC',
      ipAddress: '203.0.113.1',
      revokeSessionUrl: 'https://app.roobra.com/sessions/revoke/token',
    },
  },
};

function render(template: string, context: Record<string, unknown>): string {
  const adapter = new HandlebarsAdapter(undefined, { inlineCssEnabled: true });
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

async function main(): Promise<void> {
  const [name = 'verify-email', locale = 'en'] = process.argv.slice(2);
  const sample = SAMPLES[name];

  if (!sample) {
    console.error(
      `Unknown template "${name}". Available: ${Object.keys(SAMPLES).join(', ')}`,
    );
    process.exitCode = 1;
    return;
  }

  const html = render(`locales/${locale}/${name}`, sample.context);

  await previewEmail({
    from: '"Roobra" <no-reply@roobra.com>',
    to: 'preview@roobra.com',
    subject: sample.subject,
    html,
  });
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
