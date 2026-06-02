import crypto from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import { DateTime } from 'luxon';
import { isRecordNotFoundError } from 'src/common/utils/database.util';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TokenService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private createRefreshToken() {
    // Each byte is represented by 2 hex characters
    const length = Number(this.config.get<number>('refreshToken.length'));
    const bytes = Math.ceil(length / 2);

    return crypto.randomBytes(bytes).toString('hex');
  }

  private hashRefreshToken(token: string, algorithm: string = 'sha256') {
    return crypto.createHash(algorithm).update(token).digest('hex');
  }

  async createAccessToken(user: User) {
    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        username: user.username,
        subscriberId: user?.subscriberId ?? null,
        staffMemberId: user?.staffMemberId ?? null,
      },
      { expiresIn: this.config.get<number>('jwt.expiresIn') },
    );

    const refreshToken = this.createRefreshToken();

    await this.prisma.token.create({
      data: {
        user: { connect: { id: user.id } },
        hashedToken: this.hashRefreshToken(refreshToken),
        expiresAt: DateTime.now()
          .plus({ seconds: this.config.get<number>('refreshToken.expiresIn') })
          .toJSDate(),
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.config.get<number>('jwt.expiresIn'),
    };
  }

  async refreshAccessToken(userId: string, refreshToken: string) {
    const refreshTokenRecord = await this.prisma.token.findFirst({
      where: {
        userId,
        hashedToken: this.hashRefreshToken(refreshToken),
        revoked: false,
        expiresAt: { gt: DateTime.now().toJSDate() },
      },
    });

    if (!refreshTokenRecord) {
      throw new BadRequestException(
        'Invalid refresh token provided or token has been revoked',
      );
    }

    const user = await this.prisma.user.findUnique({
      select: {
        id: true,
        email: true,
        username: true,
        subscriberId: true,
        staffMemberId: true,
      },
      where: { id: refreshTokenRecord.userId },
    });

    if (!user) {
      throw new NotFoundException(
        'No user found for the provided refresh token',
      );
    }

    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        username: user.username,
        subscriberId: user?.subscriberId ?? null,
        staffMemberId: user?.staffMemberId ?? null,
      },
      { expiresIn: this.config.get<number>('jwt.expiresIn') },
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: this.config.get<number>('jwt.expiresIn'),
    };
  }

  async revokeRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    try {
      const refreshTokenRecord = await this.prisma.token.findFirstOrThrow({
        where: {
          revoked: false,
          hashedToken: this.hashRefreshToken(refreshToken),
          expiresAt: { gt: DateTime.now().toJSDate() },
          userId,
        },
      });

      await this.prisma.token.update({
        where: { id: refreshTokenRecord.id },
        data: { revoked: true },
      });
    } catch (error: unknown) {
      if (isRecordNotFoundError(error)) {
        throw new NotFoundException(
          'No valid refresh token found for the provided token',
        );
      }

      throw error;
    }
  }

  async revokeAllRefreshTokens(userId: string): Promise<void> {
    const count = await this.prisma.token.updateMany({
      where: {
        userId,
        revoked: false,
        expiresAt: { gt: DateTime.now().toJSDate() },
      },
      data: { revoked: true },
    });

    if (count.count === 0) {
      throw new NotFoundException('No valid refresh tokens found for the user');
    }
  }
}
