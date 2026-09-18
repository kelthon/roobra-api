import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Duration } from 'luxon';
import { LocaleType } from 'src/shared/types/locale.type';

/**
 * NOTE: not wired to any endpoint yet. Email verification (BR-12) still
 * needs its own token model + generate/consume flow on the auth side
 * (there is no `EmailVerificationToken`, unlike `PasswordResetToken`).
 * This service only covers the sending half so that work can plug straight
 * into it once the token flow exists.
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
    locale: LocaleType = 'en',
  ): Promise<void> {
    const appUrl = this.configService.getOrThrow<string>('app.frontendUrl');

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
        expiresIn: Math.round(
          Duration.fromObject({ seconds: expiresInSeconds }).as('hours'),
        ),
      },
    });
  }
}
