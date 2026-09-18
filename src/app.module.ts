import { AppController } from 'src/app.controller';
import { AppService } from 'src/app.service';
import { AuthModule } from './modules/auth/auth.module';
import { CommonModule } from './common/common.module';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { NotificationsModule } from './modules/notifications/notifications.module';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import throttlerConfig from './config/throttler.config';
import passwordResetTokenConfig from './config/password-reset-token.config';
import emailVerificationTokenConfig from './config/email-verification-token.config';
import mailConfig from './config/mail.config';
import appConfig from './config/app.config';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { join } from 'node:path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.development', '.env'],
      load: [
        databaseConfig,
        jwtConfig,
        throttlerConfig,
        passwordResetTokenConfig,
        emailVerificationTokenConfig,
        mailConfig,
        appConfig,
      ],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        config.getOrThrow('throttler.default'),
      ],
    }),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        defaults: {
          from: config.getOrThrow<string>('mail.from'),
        },
        transports: {
          smtp: {
            host: config.getOrThrow<string>('mail.host'),
            port: config.getOrThrow<number>('mail.port'),
            secure: config.getOrThrow<boolean>('mail.secure'),
            auth: {
              user: config.getOrThrow<string>('mail.user'),
              pass: config.getOrThrow<string>('mail.password'),
            },
          },
        },
        template: {
          dir: join(__dirname, '/modules/notifications/templates'),
          adapter: new HandlebarsAdapter(undefined, {
            inlineCssEnabled: true,
          }),
          options: {
            strict: true,
          },
        },
        i18n: {
          defaultLocale: 'en',
          templateDirPattern: 'locales/{{locale}}/',
          fallback: true,
        },
        options: {
          partials: {
            dir: join(__dirname, '/modules/notifications/templates/partials'),
            options: { strict: true },
          },
        },
        preview: config.getOrThrow('app.mode') !== 'production' && {
          open: true,
        },
      }),
    }),
    CommonModule,
    AuthModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
