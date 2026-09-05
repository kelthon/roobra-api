import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import AuthResponse from 'src/shared/interfaces/auth-response';
import { RefreshTokenService } from './refresh-tokens.service';

@Injectable()
export class AccessTokenService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  async generate(user: User): Promise<{ accessToken: string }> {
    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
      { expiresIn: this.config.get<number>('jwt.expiresIn') },
    );

    return { accessToken };
  }

  async refresh(userId: string, refreshToken: string): Promise<AuthResponse> {
    const token = await this.refreshTokenService.refresh(userId, refreshToken);

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

    const accessToken = await this.generate(user);
    return {
      accessToken,
      refreshToken,
      expiresIn: this.config.get<number>('jwt.expiresIn')!,
    };
  }
}
