import { Injectable, NotFoundException } from '@nestjs/common';
import { ProblemException } from 'src/common/problems/problem.js';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/generated/prisma/client.js';
import {
  PrismaService,
  PrismaTransaction,
} from 'src/modules/database/prisma.service.js';
import { ConfigService } from '@nestjs/config';
import { AuthTokensResponse } from 'src/shared/interfaces/auth-responses.js';
import { SimpleHashService } from 'src/common/services/simple-hash/simple-hash.service.js';
import { InfoResponse } from 'src/shared/interfaces/info-response.js';
import { JWTAuthPayload } from 'src/shared/interfaces/jwt-auth-payload.js';
import { DateTime } from 'luxon';
import { isRecordNotFoundError } from 'src/common/utils/database.util.js';
import { SimpleTokenService } from 'src/common/services/simple-token/simple-token.service.js';

/**
 * A session is one row of `refresh_tokens`: it starts at sign-in and ends when
 * its refresh token is revoked or expires. Access tokens are short-lived JWTs. Refresh tokens are opaque, stored only as
 * a hash, single-use and rotated on every refresh.
 *
 * @see https://github.com/kelthon/roobra-docs/blob/main/adr/2026-04-14-stateless-jwt-access-tokens.md
 * @see https://github.com/kelthon/roobra-docs/blob/main/adr/2026-09-07-refresh-token-rotation-with-reuse-detection.md
 */
@Injectable()
export class SessionsService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly simpleHashService: SimpleHashService,
    private readonly simpleTokenService: SimpleTokenService,
  ) {}

  async generate(
    user: Pick<User, 'id' | 'email' | 'username' | 'role'>,
    tx?: PrismaTransaction,
  ): Promise<AuthTokensResponse> {
    // Typed so the claims stay in line with what JwtStrategy hands to the guards
    const payload: JWTAuthPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: this.config.get<number>('jwt.expiresIn'),
      }),
      this.generateRefreshToken(user.id, tx),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.config.get<number>('jwt.expiresIn')!,
    };
  }

  private async generateRefreshToken(userId: string, tx?: PrismaTransaction) {
    const prisma = tx ?? this.prisma;

    const refreshToken = this.simpleTokenService.generate(
      this.config.get<number>('refreshToken.length'),
    );

    await prisma.refreshToken.create({
      data: {
        user: { connect: { id: userId } },
        hashedToken: this.simpleHashService.hash(refreshToken),
        expiresAt: DateTime.now()
          .plus({ seconds: this.config.get<number>('refreshToken.expiresIn') })
          .toJSDate(),
      },
    });

    return refreshToken;
  }

  /**
   * Lists the active sessions of the user, newest first, without their tokens.
   *
   * @param userId The user nano id
   */
  async getActive(userId: string) {
    return await this.prisma.refreshToken.findMany({
      select: {
        userAgent: true,
        operatingSystem: true,
        expiresAt: true,
        createdAt: true,
      },
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: DateTime.now().toJSDate() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Exchanges a refresh token for a new access and refresh token. Presenting a
   * revoked token is treated as reuse: every session of its user is revoked.
   *
   * @param refreshToken The raw refresh token
   * @throws ProblemException `invalid-token` (400) when the token is unknown,
   *   expired or revoked
   * @throws NotFoundException When the user of the token no longer exists or
   *   is deleted
   */
  async refresh(refreshToken: string): Promise<AuthTokensResponse> {
    const token = await this.prisma.refreshToken.findFirst({
      where: {
        hashedToken: this.simpleHashService.hash(refreshToken),
        expiresAt: { gt: DateTime.now().toJSDate() },
      },
    });

    if (!token) {
      throw new ProblemException(
        'invalid-token',
        'Invalid refresh token provided or token has been revoked',
      );
    }

    if (token.isRevoked) {
      await this.revokeAll(token.userId);
      throw new ProblemException(
        'invalid-token',
        'Refresh token rotation with reuse detected, all sessions revoked',
      );
    }

    const [user] = await Promise.all([
      this.prisma.user.findUnique({
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
        },
        where: { id: token.userId },
      }),
      this.prisma.refreshToken.update({
        where: { id: token.id },
        data: {
          isRevoked: true,
        },
      }),
    ]);

    if (!user) {
      throw new NotFoundException(
        'No user found for the provided refresh token',
      );
    }

    return await this.generate(user);
  }

  /**
   * Revokes one active refresh token of the user.
   *
   * @param userId The user nano id
   * @param refreshToken The raw refresh token
   * @throws NotFoundException When the user has no active token matching it
   */
  async revoke(userId: string, refreshToken: string): Promise<InfoResponse> {
    try {
      const token = await this.prisma.refreshToken.findFirstOrThrow({
        where: {
          isRevoked: false,
          hashedToken: this.simpleHashService.hash(refreshToken),
          expiresAt: { gt: DateTime.now().toJSDate() },
          userId,
        },
      });

      await this.prisma.refreshToken.update({
        where: { id: token.id },
        data: { isRevoked: true },
      });

      return { message: 'Refresh token revoked successfully' };
    } catch (error: unknown) {
      if (isRecordNotFoundError(error)) {
        throw new NotFoundException(
          'No valid refresh token found for the provided token',
        );
      }

      throw error;
    }
  }

  /**
   * Revokes every active refresh token of the user. Revoking none is not an
   * error: the caller decides whether it is.
   *
   * @param userId The user nano id
   * @param tx The transaction to run in, when the caller has one
   * @returns How many tokens were revoked
   */
  async revokeAll(userId: string, tx?: PrismaTransaction): Promise<number> {
    const prisma = tx ?? this.prisma;

    const { count } = await prisma.refreshToken.updateMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: DateTime.now().toJSDate() },
      },
      data: { isRevoked: true },
    });

    return count;
  }
}
