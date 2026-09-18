import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { PasswordResetMailService } from './password-reset-mail.service';

describe('PasswordResetMailService', () => {
  let mailerServiceMock: MailerService;
  let configServiceMock: ConfigService;
  let service: PasswordResetMailService;

  beforeEach(() => {
    mailerServiceMock = {
      sendMail: jest.fn(),
    } as unknown as MailerService;

    configServiceMock = {
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, unknown> = {
          'app.frontendUrl': 'https://app.roobra.com',
          'passwordResetToken.expiresIn': 900,
        };
        return values[key];
      }),
    } as unknown as ConfigService;

    service = new PasswordResetMailService(
      mailerServiceMock,
      configServiceMock,
    );
  });

  it('should send the reset-password template with a link built from the raw token', async () => {
    await service.send('john.doe@example.com', 'john.doe', 'raw-reset-token');

    expect(mailerServiceMock.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'john.doe@example.com',
        template: 'reset-password',
        locale: 'en',
        context: expect.objectContaining({
          username: 'john.doe',
          resetPasswordUrl:
            'https://app.roobra.com/reset-password/raw-reset-token',
          expiresIn: 15,
        }),
      }),
    );
  });

  it('should default the locale to "en" when none is given', async () => {
    await service.send('john.doe@example.com', 'john.doe', 'raw-reset-token');

    expect(mailerServiceMock.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ locale: 'en' }),
    );
  });

  it('should forward an explicit locale', async () => {
    await service.send(
      'john.doe@example.com',
      'john.doe',
      'raw-reset-token',
      'pt',
    );

    expect(mailerServiceMock.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ locale: 'pt' }),
    );
  });
});
