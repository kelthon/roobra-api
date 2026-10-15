import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ProblemException } from 'src/common/problems/problem.js';
import {
  PrismaService,
  PrismaTransaction,
} from 'src/modules/database/prisma.service.js';
import { RegisterUserDto } from './dto/register-user.dto.js';
import { PasswordHashService } from './services/password-hash/password-hash.service.js';
import {
  isRecordNotFoundError,
  isUniqueConstraintViolationError,
} from 'src/common/utils/database.util.js';
import { SessionsService } from '../sessions/sessions.service.js';
import { LogoutDto } from './dto/logout.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { InfoResponse } from 'src/shared/interfaces/info-response.js';
import { DateTime } from 'luxon';
import { SimpleHashService } from 'src/common/services/simple-hash/simple-hash.service.js';
import { SuccessAuthenticationResponse } from 'src/shared/interfaces/auth-responses.js';
import { JWTAuthPayload } from 'src/shared/interfaces/jwt-auth-payload.js';
import { ConfigService } from '@nestjs/config';
import { SimpleTokenService } from 'src/common/services/simple-token/simple-token.service.js';
import { PasswordResetMailService } from 'src/modules/notifications/services/password-reset-mail.service.js';
import { EmailVerificationMailService } from '../notifications/services/email-verification-mail.service.js';

/**
 * Reset and verification links carry one-time opaque tokens, stored only as
 * hashes and consumed in the same transaction as their effect.
 *
 * @see docs/adr/2026-09-11-01-one-time-opaque-tokens-for-reset-and-verification.md
 */
@Injectable()
export class AuthService {
  private readonly AUTH_USER_SELECT = {
    id: true,
    email: true,
    username: true,
    role: true,
    photoUrl: true,
  } as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly hashService: PasswordHashService,
    private readonly sessionsService: SessionsService,
    private readonly simpleHashService: SimpleHashService,
    private readonly simpleTokenService: SimpleTokenService,
    private readonly configService: ConfigService,
    private readonly passwordResetMailService: PasswordResetMailService,
    private readonly emailVerificationMailService: EmailVerificationMailService,
  ) {}

  /**
   * Checks an email and password for the local strategy, returning null instead
   * of throwing when they do not match.
   *
   * @param email The user email
   * @param password The plain password
   */
  async validateUser(
    email: string,
    password: string,
  ): Promise<JWTAuthPayload | null> {
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

    return {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };
  }

  /**
   * Creates an account and signs the user in.
   *
   * @param registerDto The account data
   * @throws ProblemException `email-in-use` or `username-in-use` (409)
   */
  async register(
    registerDto: RegisterUserDto,
  ): Promise<SuccessAuthenticationResponse> {
    const { username, email, password } = registerDto;

    try {
      const hashedPassword = await this.hashService.hash(password);

      const [user, tokens] = await this.prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          select: this.AUTH_USER_SELECT,
          data: {
            email,
            username,
            hashedPassword,
          },
        });

        const tokens = await this.sessionsService.generate(newUser, tx);

        return [newUser, tokens];
      });

      const { role: _role, ...safeUser } = user;

      return {
        ...tokens,
        user: safeUser,
      };
    } catch (error: unknown) {
      if (isUniqueConstraintViolationError(error)) {
        const targets = error.meta?.target;

        if (targets?.includes('email')) {
          throw new ProblemException('email-in-use');
        }

        if (targets?.includes('username')) {
          throw new ProblemException('username-in-use');
        }

        throw new ConflictException('Conflict data already in use');
      }
      throw error;
    }
  }

  /**
   * Signs in a user the local strategy already authenticated.
   *
   * @param userId The user nano id
   * @throws ProblemException `invalid-credentials` (401) when the user was
   *   deleted after the local strategy checked them
   */
  async login(userId: string): Promise<SuccessAuthenticationResponse> {
    try {
      const user = await this.prisma.user.findUniqueOrThrow({
        select: this.AUTH_USER_SELECT,
        where: { id: userId },
      });

      const tokens = await this.sessionsService.generate(user);
      const { role: _role, ...safeUser } = user;

      return {
        ...tokens,
        user: safeUser,
      };
    } catch (error: unknown) {
      if (isRecordNotFoundError(error)) {
        throw new ProblemException('invalid-credentials');
      }

      throw error;
    }
  }

  async logout(userId: string, logoutDto: LogoutDto) {
    const { refreshToken } = logoutDto;
    return await this.sessionsService.revoke(userId, refreshToken);
  }

  /**
   * Signs the user out of every session.
   *
   * @param userId The user nano id
   * @throws NotFoundException When the user has no active session
   */
  async logoutAllSessions(userId: string): Promise<InfoResponse> {
    const count = await this.sessionsService.revokeAll(userId);

    if (count === 0) {
      throw new NotFoundException('No valid refresh tokens found for the user');
    }

    return { message: 'All refresh tokens revoked successfully' };
  }

  async getActiveSessions(userId: string) {
    return await this.sessionsService.getActive(userId);
  }

  async refreshSession(refreshTokenDto: RefreshTokenDto) {
    const { refreshToken } = refreshTokenDto;
    return await this.sessionsService.refresh(refreshToken);
  }

  /**
   * Starts the password recovery: creates a reset token and emails the link
   *
   * Always answers with the same message, whether or not an account exists for
   * the email, so the endpoint cannot be used to find out which emails are
   * registered.
   *
   * @param forgotPasswordDto The recovery request
   * @param forgotPasswordDto.email The email of the account to recover
   */
  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<InfoResponse> {
    const { email } = forgotPasswordDto;
    const response = {
      message:
        'If an account exists for that email, a password reset link has been sent. Please check your inbox',
    };

    try {
      const user = await this.prisma.user.findUniqueOrThrow({
        where: { email },
      });

      const token = this.simpleTokenService.generate(
        this.configService.getOrThrow<number>('passwordResetToken.length'),
      );
      const hashedToken = this.simpleHashService.hash(token);

      await this.prisma.passwordResetToken.create({
        data: {
          hashedToken,
          userId: user.id,
          expiresAt: DateTime.now()
            .plus({
              seconds: this.configService.getOrThrow<number>(
                'passwordResetToken.expiresIn',
              ),
            })
            .toJSDate(),
        },
      });

      await this.passwordResetMailService.send(
        user.email,
        user.username,
        token,
      );

      return response;
    } catch (error: unknown) {
      if (isRecordNotFoundError(error)) {
        return response;
      }
      throw error;
    }
  }

  /**
   * Sets a new password using a reset token.
   *
   * @param resetPasswordDto The reset token and the new password
   * @throws ProblemException `invalid-token` (400) when the token does not
   *   exist, was used or has expired
   */
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

      return await this.prisma.$transaction(async (tx) => {
        await tx.passwordResetToken.update({
          where: { id: passwordResetToken.id },
          data: { usedAt: DateTime.now().toJSDate() },
        });

        return await this.updatePassword(
          passwordResetToken.userId,
          newPassword,
          tx,
        );
      });
    } catch (error: unknown) {
      if (isRecordNotFoundError(error)) {
        throw new ProblemException('invalid-token');
      }
      throw error;
    }
  }

  /**
   * Changes the password after checking the current one.
   *
   * @param userId The user nano id
   * @param changePasswordDto The current and the new password
   * @throws ProblemException `incorrect-password` (400) when the current
   *   password is wrong
   * @throws UnauthorizedException When the signed-in user no longer exists
   */
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
        throw new ProblemException('incorrect-password');
      }

      return await this.updatePassword(userId, newPassword);
    } catch (error: unknown) {
      if (isRecordNotFoundError(error)) {
        throw new UnauthorizedException('The signed-in user no longer exists');
      }
      throw error;
    }
  }

  /**
   * Hashes and stores a new password.
   *
   * @param userId The user nano id
   * @param newPassword The plain new password
   * @param tx The transaction to run in, when called inside one
   * @throws The Prisma `P2025` error when the user does not exist or is
   *   deleted; each caller answers it in its own terms
   */
  async updatePassword(
    userId: string,
    newPassword: string,
    tx?: PrismaTransaction,
  ) {
    const prisma = tx ?? this.prisma;

    return await prisma.user.update({
      where: { id: userId },
      data: {
        hashedPassword: await this.hashService.hash(newPassword),
      },
    });
  }

  /**
   * Creates an email verification token and emails the link.
   *
   * @param userId The user nano id
   * @throws UnauthorizedException When the signed-in user no longer exists
   */
  async sendVerificationEmail(userId: string) {
    try {
      const user = await this.prisma.user.findUniqueOrThrow({
        select: { id: true, email: true, username: true },
        where: { id: userId },
      });
      const token = this.simpleTokenService.generate(
        this.configService.getOrThrow<number>('emailVerificationToken.length'),
      );
      const expiresIn = this.configService.getOrThrow<number>(
        'emailVerificationToken.expiresIn',
      );

      // The token must be saved before the link is sent, otherwise a link can
      // reach the user for a token that does not exist (or fail to send and
      // leave a token nobody knows about).
      await this.prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          hashedToken: this.simpleHashService.hash(token),
          expiresAt: DateTime.now().plus({ seconds: expiresIn }).toJSDate(),
        },
      });

      await this.emailVerificationMailService.send(
        user.email,
        user.username,
        token,
        expiresIn,
      );

      return {
        message:
          'The link to verify your email was sent check your inbox and spam',
      };
    } catch (error: unknown) {
      if (isRecordNotFoundError(error)) {
        throw new UnauthorizedException('The signed-in user no longer exists');
      }
      throw error;
    }
  }

  /**
   * Marks the user's email as verified.
   *
   * @param token The raw token from the verification link
   * @throws ProblemException `invalid-token` (400) when the token does not
   *   exist, was used or has expired
   */
  async verifyEmail(token: string) {
    try {
      const { id, userId } =
        await this.prisma.emailVerificationToken.findUniqueOrThrow({
          select: {
            id: true,
            userId: true,
          },
          where: {
            hashedToken: this.simpleHashService.hash(token),
            expiresAt: { gt: DateTime.now().toJSDate() },
            usedAt: null,
          },
        });

      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: userId },
          data: { emailVerifiedAt: DateTime.now().toJSDate() },
        }),
        this.prisma.emailVerificationToken.update({
          where: { id },
          data: {
            usedAt: DateTime.now().toJSDate(),
          },
        }),
      ]);

      return { message: 'Email was verified successfully' };
    } catch (error: unknown) {
      if (isRecordNotFoundError(error)) {
        throw new ProblemException('invalid-token');
      }
      throw error;
    }
  }
}
