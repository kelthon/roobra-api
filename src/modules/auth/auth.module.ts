import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { DatabaseModule } from '../database/database.module';
import { PasswordHashService } from './password-hash.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AccessTokenService } from './access-token.service';
import { LocalStrategy } from './strategies/local.strategy';
import { RolesGuard } from './guards/roles/roles.guard';
import { SimpleHashService } from './simple-hash.service';
import { SimpleTokenService } from './simple-token.service';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
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
    SimpleHashService,
    SimpleTokenService,
    JwtStrategy,
    LocalStrategy,
    RolesGuard,
  ],
  controllers: [AuthController],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
