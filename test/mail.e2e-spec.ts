import { Test, TestingModule } from '@nestjs/testing';
import { MailerService } from '@nestjs-modules/mailer';
import type { Transporter } from 'nodemailer';
import type { MockInstance } from 'vitest';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from '@app/app.module.js';
import { appOptions, configureApp } from '@app/app.setup.js';
import { EmailVerificationMailService } from '@app/modules/notifications/services/email-verification-mail.service.js';
import { PasswordResetMailService } from '@app/modules/notifications/services/password-reset-mail.service.js';

describe('Mail sending (e2e)', () => {
  let app: NestExpressApplication;
  let sendMail: MockInstance;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app =
      moduleFixture.createNestApplication<NestExpressApplication>(appOptions);
    configureApp(app);

    await app.init();

    // The services send through the default transporter. Stubbing it keeps
    // the SMTP server out of the test, and fails it if there is no default.
    // Templates are rendered inside the transporter, so render.spec.ts covers
    // them instead.
    const transporter = (
      app.get(MailerService) as unknown as { transporter?: Transporter }
    ).transporter;
    expect(transporter).toBeDefined();
    sendMail = vi
      .spyOn(transporter!, 'sendMail')
      .mockResolvedValue({} as never);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    sendMail.mockClear();
  });

  it('should send the email verification email with its link', async () => {
    await app
      .get(EmailVerificationMailService)
      .send('john.doe@example.com', 'john.doe', 'verify-token', 86_400);

    expect(sendMail).toHaveBeenCalledOnce();
    expect(sendMail.mock.calls[0][0]).toMatchObject({
      to: 'john.doe@example.com',
      template: 'locales/en/verify-email',
      context: {
        verifyEmailUrl: 'http://localhost:5173/verify-email/verify-token',
      },
    });
  });

  it('should send the password reset email with its link', async () => {
    await app
      .get(PasswordResetMailService)
      .send('john.doe@example.com', 'john.doe', 'reset-token');

    expect(sendMail).toHaveBeenCalledOnce();
    expect(sendMail.mock.calls[0][0]).toMatchObject({
      to: 'john.doe@example.com',
      template: 'locales/en/reset-password',
      context: {
        resetPasswordUrl: 'http://localhost:5173/reset-password/reset-token',
      },
    });
  });
});
