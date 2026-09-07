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
import { SimpleHashService } from './simple-hash.service';
import { InfoResponse } from 'src/shared/interfaces/info-response';
import { DateTime } from 'luxon';
import { isRecordNotFoundError } from 'src/common/utils/database.util';
import { SimpleTokenService } from './simple-token.service';

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
    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
      { expiresIn: this.config.get<number>('jwt.expiresIn') },
    );

    const refreshToken = await this.generateRefreshToken(user.id);

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
        isRevoked: false,
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

    await this.prisma.refreshToken.update({
      where: { id: token.id },
      data: {
        isRevoked: true,
      },
    });

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
