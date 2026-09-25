import { AppController } from 'src/app.controller.js';
import { AppService } from 'src/app.service.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CommonModule } from './common/common.module.js';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import jwtConfig from './config/jwt.config.js';
import throttlerConfig from './config/throttler.config.js';
import passwordResetTokenConfig from './config/password-reset-token.config.js';
import emailVerificationTokenConfig from './config/email-verification-token.config.js';
import mailConfig from './config/mail.config.js';
import appConfig from './config/app.config.js';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { join } from 'node:path';
import { EnvSchema } from 'common/schemas/env.schema.js';
import databaseConfig from 'config/database.config.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.development', '.env'],
      validationSchema: EnvSchema,
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
          dir: join(import.meta.dirname, '/modules/notifications/templates'),
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
            dir: join(
              import.meta.dirname,
              '/modules/notifications/templates/partials',
            ),
            options: { strict: true },
          },
          layout: 'layouts/main',
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
