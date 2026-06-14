import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/modules/database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { HashService } from './hash.service';
import {
  isRecordNotFoundError,
  isUniqueConstraintViolationError,
} from 'src/common/utils/database.util';
import { TokenService } from './token.service';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { InfoResponse } from 'src/shared/interfaces/info-response';
import { DateTime } from 'luxon';
import { User } from 'src/generated/prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashService: HashService,
    private readonly tokenService: TokenService,
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

  async register(registerDto: RegisterUserDto) {
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

      const tokens = await this.tokenService.createAccessToken(user);

      return {
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          emailVerifiedAt: user.emailVerifiedAt,
          createdAt: user.createdAt,
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

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    try {
      const user = await this.prisma.user.findUniqueOrThrow({
        where: { email },
      });

      const isPasswordValid = await this.hashService.verify(
        password,
        `${user?.hashedPassword}`,
      );

      if (!isPasswordValid) {
        throw new BadRequestException('Password is incorrect');
      }

      const accessTokens = await this.tokenService.createAccessToken(user);

      return {
        ...accessTokens,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          emailVerifiedAt: user.emailVerifiedAt,
          createdAt: user.createdAt,
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
    return await this.tokenService.revokeRefreshToken(userId, refreshToken);
  }

  async logoutAllSessions(userId: string): Promise<InfoResponse> {
    return await this.tokenService.revokeAllRefreshTokens(userId);
  }

  async refreshToken(userId: string, refreshTokenDto: RefreshTokenDto) {
    const { refreshToken } = refreshTokenDto;
    return await this.tokenService.refreshAccessToken(userId, refreshToken);
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
          'If an account with that email exists, a password reset link has been sent',
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

    try {
      const passwordResetToken =
        await this.prisma.passwordResetToken.findUniqueOrThrow({
          where: {
            hashedToken: resetToken,
            usedAt: null,
            expiresAt: { gt: DateTime.now().toJSDate() },
          },
        });

      const user = await this.prisma.user.update({
        where: { id: passwordResetToken.userId },
        data: {
          hashedPassword: await this.hashService.hash(newPassword),
        },
      });

      return user;
    } catch (error: unknown) {
      if (isRecordNotFoundError(error)) {
        throw new BadRequestException('No user found with the provided token');
      }
      throw error;
    }
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const { newPassword } = changePasswordDto;

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
