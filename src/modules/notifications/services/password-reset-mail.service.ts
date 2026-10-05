import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import { Duration } from 'luxon';
import { LocaleType } from 'src/shared/types/locale.type';

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
   * @param locale The language of the email
   */
  async send(
    to: string,
    username: string,
    resetToken: string,
    locale: LocaleType = 'en',
  ): Promise<void> {
    const appUrl = this.configService.getOrThrow<string>('app.frontendUrl');
    const expiresInSeconds = this.configService.getOrThrow<number>(
      'passwordResetToken.expiresIn',
    );

    await this.mailerService.sendMail({
      to,
      subject: 'Reset your Roobra password',
      template: 'reset-password',
      locale,
      context: {
        title: 'Reset your password',
        username,
        emailSubject: 'Reset your Roobra password',
        messageBody:
          'We received a request to reset your password. Click the button below to choose a new one.',
        buttonText: 'Reset password',
        categoryBadge: 'Security',
        preheaderText: 'Use this link to reset your password.',
        appUrl,
        // TODO: When fronend is finally ready change this mock url
        resetPasswordUrl: `${appUrl}/reset-password/${resetToken}`,
        expiresIn: Math.round(
          Duration.fromObject({ seconds: expiresInSeconds }).as('minutes'),
        ),
      },
    });
  }
}
