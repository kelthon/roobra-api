import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { AuthTokensResponse } from 'src/shared/interfaces/auth-responses';
import { SimpleHashService } from 'src/common/services/simple-hash/simple-hash.service';
import { InfoResponse } from 'src/shared/interfaces/info-response';
import { DateTime } from 'luxon';
import { isRecordNotFoundError } from 'src/common/utils/database.util';
import { SimpleTokenService } from 'src/common/services/simple-token/simple-token.service';

@Injectable()
export class AccessTokenService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly simpleHashService: SimpleHashService,
    private readonly simpleTokenService: SimpleTokenService,
  ) {}

  async generate(
    user: Pick<User, 'id' | 'email' | 'username' | 'role'>,
  ): Promise<AuthTokensResponse> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
        },
        { expiresIn: this.config.get<number>('jwt.expiresIn') },
      ),
      this.generateRefreshToken(user.id),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.config.get<number>('jwt.expiresIn')!,
    };
  }

  private async generateRefreshToken(userId: string) {
    const refreshToken = this.simpleTokenService.generate(
      this.config.get<number>('refreshToken.length'),
    );

    await this.prisma.refreshToken.create({
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

  async refresh(refreshToken: string): Promise<AuthTokensResponse> {
    const token = await this.prisma.refreshToken.findFirst({
      where: {
        hashedToken: this.simpleHashService.hash(refreshToken),
        expiresAt: { gt: DateTime.now().toJSDate() },
      },
    });

    if (!token) {
      throw new BadRequestException(
        'Invalid refresh token provided or token has been revoked',
      );
    }

    if (token.isRevoked) {
      await this.revokeAll(token.userId);
      throw new BadRequestException(
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

  async revokeAll(userId: string): Promise<InfoResponse> {
    const count = await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: DateTime.now().toJSDate() },
      },
      data: { isRevoked: true },
    });

    if (count.count === 0) {
      throw new NotFoundException('No valid refresh tokens found for the user');
    }

    return {
      message: 'All refresh tokens revoked successfully',
    };
  }
}
