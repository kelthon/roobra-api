import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { LocalStrategy } from './strategies/local.strategy.js';
import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { PassportModule } from '@nestjs/passport';
import { PasswordHashService } from './services/password-hash/password-hash.service.js';
import { RolesGuard } from './guards/roles/roles.guard.js';
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
