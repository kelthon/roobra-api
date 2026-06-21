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
import AuthResponse from 'src/shared/interfaces/auth-response';
import { InfoResponse } from 'src/shared/interfaces/info-response';

// TODO: create JWTTokenService for JWT PlainTokenService for resetPAssword and refreshToken

@Injectable()
export class TokenService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private createRefreshToken(): string {
    // Each byte is represented by 2 hex characters
    const length = Number(this.config.get<number>('refreshToken.length'));
    const bytes = Math.ceil(length / 2);

    return crypto.randomBytes(bytes).toString('hex');
  }

  private hashToken(token: string, algorithm: string = 'sha256'): string {
    return crypto.createHash(algorithm).update(token).digest('hex');
  }

  async createAccessToken(user: User): Promise<AuthResponse> {
    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        username: user.username,
      },
      { expiresIn: this.config.get<number>('jwt.expiresIn') },
    );

    const refreshToken = this.createRefreshToken();

    await this.prisma.refreshToken.create({
      data: {
        user: { connect: { id: user.id } },
        hashedToken: this.hashToken(refreshToken),
        expiresAt: DateTime.now()
          .plus({ seconds: this.config.get<number>('refreshToken.expiresIn') })
          .toJSDate(),
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.config.get<number>('jwt.expiresIn')!,
    };
  }

  async refreshAccessToken(
    userId: string,
    refreshToken: string,
  ): Promise<AuthResponse> {
    const token = await this.prisma.refreshToken.findFirst({
      where: {
        userId,
        hashedToken: this.hashToken(refreshToken),
        revoked: false,
        expiresAt: { gt: DateTime.now().toJSDate() },
      },
    });

    if (!token) {
      throw new BadRequestException(
        'Invalid refresh token provided or token has been revoked',
      );
    }

    const user = await this.prisma.user.findUnique({
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
      },
      where: { id: token.userId },
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
        role: user.role,
      },
      { expiresIn: this.config.get<number>('jwt.expiresIn') },
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: this.config.get<number>('jwt.expiresIn')!,
    };
  }

  async revokeRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<InfoResponse> {
    try {
      const token = await this.prisma.refreshToken.findFirstOrThrow({
        where: {
          revoked: false,
          hashedToken: this.hashToken(refreshToken),
          expiresAt: { gt: DateTime.now().toJSDate() },
          userId,
        },
      });

      await this.prisma.refreshToken.update({
        where: { id: token.id },
        data: { revoked: true },
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

  async revokeAllRefreshTokens(userId: string): Promise<InfoResponse> {
    const count = await this.prisma.refreshToken.updateMany({
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

    return {
      message: 'All refresh tokens revoked successfully',
    };
  }
}
