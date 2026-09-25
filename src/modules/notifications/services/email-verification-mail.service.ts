import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Duration } from 'luxon';
import { LocaleType } from 'src/shared/types/locale.type.js';

@Injectable()
export class EmailVerificationMailService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Sends the email verification email with a link back to the frontend.
   *
   * @param to The recipient email
   * @param username The recipient username, used for the greeting
   * @param verificationToken The raw (unhashed) verification token to embed in
   *   the link
   * @param expiresInSeconds How long the token is valid, shown in hours
   * @param locale The language of the email
   */
  async send(
    to: string,
    username: string,
    verificationToken: string,
    expiresInSeconds: number,
    locale: LocaleType = 'en',
  ): Promise<void> {
    const appUrl = this.configService.getOrThrow<string>('app.frontendUrl');
    const expiresInHours = Math.round(
      Duration.fromObject({ seconds: expiresInSeconds }).as('hours'),
    );

    await this.mailerService.sendMail({
      to,
      subject: 'Verify your Roobra email address',
      template: 'verify-email',
      locale,
      context: {
        title: 'Verify your email address',
        username,
        emailSubject: 'Verify your Roobra email address',
        messageBody:
          'Please confirm that this is your email address by clicking the button below to activate your account.',
        buttonText: 'Verify email',
        categoryBadge: 'Verification',
        preheaderText: 'Confirm your email to finish setting up your account.',
        appUrl,
        // TODO: When fronend is finally ready change this mock url
        verifyEmailUrl: `${appUrl}/verify-email/${verificationToken}`,
        expiresInLabel: `${expiresInHours} hour${expiresInHours === 1 ? '' : 's'}`,
      },
    });
  }
}
