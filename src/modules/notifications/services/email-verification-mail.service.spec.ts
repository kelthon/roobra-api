import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { EmailVerificationMailService } from './email-verification-mail.service.js';

describe('EmailVerificationMailService', () => {
  let mailerServiceMock: MailerService;
  let configServiceMock: ConfigService;
  let service: EmailVerificationMailService;

  beforeEach(() => {
    mailerServiceMock = {
      sendMail: vi.fn(),
    } as unknown as MailerService;

    configServiceMock = {
      getOrThrow: vi.fn((key: string) => {
        const values: Record<string, unknown> = {
          'app.frontendUrl': 'https://app.roobra.com',
        };
        return values[key];
      }),
    } as unknown as ConfigService;

    service = new EmailVerificationMailService(
      mailerServiceMock,
      configServiceMock,
    );
  });

  it('should send the verify-email template with a link built from the raw token', async () => {
    // 7200 seconds = 2 hours, to make the hour rounding easy to assert on
    await service.send(
      'john.doe@example.com',
      'john.doe',
      'raw-verification-token',
      7200,
    );

    expect(mailerServiceMock.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'john.doe@example.com',
        template: 'verify-email',
        locale: 'en',
        context: expect.objectContaining({
          username: 'john.doe',
          verifyEmailUrl:
            'https://app.roobra.com/verify-email/raw-verification-token',
          expiresInLabel: '2 hours',
        }),
      }),
    );
  });

  it('should singularize expiresInLabel for a one-hour expiry', async () => {
    await service.send('john.doe@example.com', 'john.doe', 'token', 3600);

    expect(mailerServiceMock.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({ expiresInLabel: '1 hour' }),
      }),
    );
  });

  it('should default the locale to "en" when none is given', async () => {
    await service.send('john.doe@example.com', 'john.doe', 'token', 3600);

    expect(mailerServiceMock.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ locale: 'en' }),
    );
  });

  it('should forward an explicit locale', async () => {
    await service.send('john.doe@example.com', 'john.doe', 'token', 3600, 'pt');

    expect(mailerServiceMock.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ locale: 'pt' }),
    );
  });
});
