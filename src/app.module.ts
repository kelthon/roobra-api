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
import { EnvSchema } from 'common/schemas/env.schema.js';
import databaseConfig from 'config/database.config.js';
import { UsersModule } from './modules/users/users.module.js';
import { mailerOptionsFactory } from './modules/notifications/config/mailer-options.factory.js';
import { LoggerModule } from 'nestjs-pino';
import { loggerOptionsFactory } from './common/logger/logger-options.factory.js';

@Module({
  imports: [
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: loggerOptionsFactory,
    }),
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
      useFactory: mailerOptionsFactory,
    }),
    CommonModule,
    AuthModule,
    NotificationsModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
