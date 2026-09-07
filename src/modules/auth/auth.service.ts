import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/modules/database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { PasswordHashService } from './password-hash.service';
import {
  isRecordNotFoundError,
  isUniqueConstraintViolationError,
} from 'src/common/utils/database.util';
import { AccessTokenService } from './access-token.service';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { InfoResponse } from 'src/shared/interfaces/info-response';
import { DateTime } from 'luxon';
import { User } from 'src/generated/prisma/client';
import { SimpleHashService } from './simple-hash.service';
import { SuccessAuthenticationResponse } from 'src/shared/interfaces/auth-responses';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashService: PasswordHashService,
    private readonly accessTokenService: AccessTokenService,
    private readonly simpleHashService: SimpleHashService,
  ) {}

  async getMe(userId: string) {
    try {
      const user = await this.prisma.user.findUniqueOrThrow({
        select: {
          id: true,
          email: true,
          username: true,
          emailVerifiedAt: true,
          createdAt: true,
        },
        where: { id: userId },
      });

      return user;
    } catch (error: unknown) {
      if (isRecordNotFoundError(error)) {
        throw new BadRequestException('No user was found with provided id');
      }
      throw error;
    }
  }

  /**
   * Validates user crendentials without generate access tokens
   *
   * Used for guards not requires throw errors
   *
   * @param email the user email
   * @param password the user password
   */
  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      omit: { hashedPassword: false },
    });

    if (!user) {
      return null;
    }

    const isPasswordValid = await this.hashService.verify(
      password,
      user.hashedPassword ?? '',
    );

    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async register(
    registerDto: RegisterUserDto,
  ): Promise<SuccessAuthenticationResponse> {
    const { username, email, password } = registerDto;

    try {
      const hashedPassword = await this.hashService.hash(password);

      const user = await this.prisma.user.create({
        data: {
          email,
          username,
          hashedPassword,
        },
      });

      const tokens = await this.accessTokenService.generate(user);

      return {
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          birthdate: user.birthdate,
          photoUrl: user.photoUrl,
          emailVerifiedAt: user.emailVerifiedAt,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      };
    } catch (error: unknown) {
      if (isUniqueConstraintViolationError(error)) {
        const targets = error.meta?.target;

        if (targets?.includes('email')) {
          throw new BadRequestException('Email already in use');
        }

        if (targets?.includes('username')) {
          throw new BadRequestException('Username already in use');
        }

        throw new BadRequestException('Conflict data already in use');
      }
      throw error;
    }
  }

  async login(loginDto: LoginDto): Promise<SuccessAuthenticationResponse> {
    const { email, password } = loginDto;
    try {
      const user = await this.prisma.user.findUniqueOrThrow({
        where: { email },
        omit: { hashedPassword: false },
      });

      const isPasswordValid =
        user?.hashedPassword &&
        (await this.hashService.verify(password, user.hashedPassword));

      if (!isPasswordValid) {
        throw new BadRequestException('Password is incorrect');
      }

      const tokens = await this.accessTokenService.generate(user);

      return {
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          birthdate: user.birthdate,
          photoUrl: user.photoUrl,
          emailVerifiedAt: user.emailVerifiedAt,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      };
    } catch (error: unknown) {
      if (isRecordNotFoundError(error)) {
        throw new BadRequestException('No user found with the provided email');
      }

      throw error;
    }
  }

  async logout(userId: string, logoutDto: LogoutDto) {
    const { refreshToken } = logoutDto;
    return await this.accessTokenService.revoke(userId, refreshToken);
  }

  async logoutAllSessions(userId: string): Promise<InfoResponse> {
    return await this.accessTokenService.revokeAll(userId);
  }

  async refreshSession(refreshTokenDto: RefreshTokenDto) {
    const { refreshToken } = refreshTokenDto;
    return await this.accessTokenService.refresh(refreshToken);
  }

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<InfoResponse> {
    const { email } = forgotPasswordDto;

    try {
      await this.prisma.user.findUniqueOrThrow({
        where: { email },
      });

      // TODO: Implement forgot password logic (e.g., generate reset token, send email)

      return {
        message:
          'A password reset link has been sent for the provided e-mail account, please check your inbox',
      };
    } catch (error: unknown) {
      if (isRecordNotFoundError(error)) {
        throw new BadRequestException('No user found with the provided email');
      }
      throw error;
    }
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { resetToken, newPassword } = resetPasswordDto;
    const hashedToken = this.simpleHashService.hash(resetToken);

    try {
      const passwordResetToken =
        await this.prisma.passwordResetToken.findUniqueOrThrow({
          where: {
            hashedToken,
            usedAt: null,
            expiresAt: { gt: DateTime.now().toJSDate() },
          },
        });

      await this.prisma.passwordResetToken.update({
        where: { id: passwordResetToken.id },
        data: { usedAt: DateTime.now().toJSDate() },
      });

      return this.updatePassword(passwordResetToken.userId, newPassword);
    } catch (error: unknown) {
      if (isRecordNotFoundError(error)) {
        throw new BadRequestException('No user found with the provided token');
      }
      throw error;
    }
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const { currentPassword, newPassword } = changePasswordDto;

    try {
      const { hashedPassword } = await this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { hashedPassword: true },
      });

      if (
        !(await this.hashService.verify(currentPassword, hashedPassword || ''))
      ) {
        throw new BadRequestException('Incorrect password');
      }

      return this.updatePassword(userId, newPassword);
    } catch (error: unknown) {
      if (isRecordNotFoundError(error)) {
        throw new BadRequestException('No user found');
      }
      throw error;
    }
  }

  async updatePassword(userId: string, newPassword: string) {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: {
          hashedPassword: await this.hashService.hash(newPassword),
        },
      });

      return user;
    } catch (error: unknown) {
      if (isRecordNotFoundError(error)) {
        throw new BadRequestException('No user found');
      }
      throw error;
    }
  }
}
