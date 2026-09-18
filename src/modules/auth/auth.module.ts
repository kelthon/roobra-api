import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { DatabaseModule } from '../database/database.module';
import { PasswordHashService } from './services/password-hash/password-hash.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AccessTokenService } from './services/access-token/access-token.service';
import { LocalStrategy } from './strategies/local.strategy';
import { RolesGuard } from './guards/roles/roles.guard';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    NotificationsModule,
    PassportModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.getOrThrow<number>('jwt.expiresIn'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    AuthService,
    PasswordHashService,
    AccessTokenService,
    JwtStrategy,
    LocalStrategy,
    // NOTE: RBAC guard — wired to content-mutation routes in Sprint 2 (backlog 1.2.1/1.2.3)
    RolesGuard,
  ],
  controllers: [AuthController],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
