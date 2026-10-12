import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service.js';
import { DatabaseModule } from '../database/database.module.js';
import { PasswordHashService } from './services/password-hash/password-hash.service.js';
import { AuthController } from './auth.controller.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { LocalStrategy } from './strategies/local.strategy.js';
import { RolesGuard } from './guards/roles/roles.guard.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { SessionsModule } from '../sessions/sessions.module.js';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    NotificationsModule,
    PassportModule,
    SessionsModule,
  ],
  providers: [
    AuthService,
    PasswordHashService,
    JwtStrategy,
    LocalStrategy,
    // NOTE: RBAC guard — wired to content-mutation routes in Sprint 2 (backlog 1.2.1/1.2.3)
    RolesGuard,
  ],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
