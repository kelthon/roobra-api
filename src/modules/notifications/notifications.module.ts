import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PasswordResetMailService } from './services/password-reset-mail.service';
import { EmailVerificationMailService } from './services/email-verification-mail.service';

@Module({
  imports: [ConfigModule],
  providers: [PasswordResetMailService, EmailVerificationMailService],
  exports: [PasswordResetMailService, EmailVerificationMailService],
})
export class NotificationsModule {}
