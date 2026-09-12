import { AppController } from 'src/app.controller';
import { AppService } from 'src/app.service';
import { AuthModule } from './modules/auth/auth.module';
import { CommonModule } from './common/common.module';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import throttlerConfig from './config/throttler.config';
import passwordResetTokenConfig from './config/password-reset-token.config';
import mailConfig from './config/mail.config';
import appConfig from './config/app.config';

@Module({
  imports: [
    CommonModule,
    AuthModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.development', '.env'],
      load: [
        databaseConfig,
        jwtConfig,
        throttlerConfig,
        passwordResetTokenConfig,
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
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
