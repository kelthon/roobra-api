import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { TokenService } from './token.service';
import { ConfigService } from '@nestjs/config';
import { User } from 'src/generated/prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('TokenService', () => {
  let tokenService: TokenService;
  let prismaMock: PrismaService;
  let configServiceMock: ConfigService;
  let jwtServiceMock: JwtService;

  // Mocking services and dependencies
  beforeEach(() => {
    jwtServiceMock = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
    } as unknown as JwtService;

    prismaMock = {
      refreshToken: {
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findFirst: jest.fn(),
        findFirstOrThrow: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
    } as unknown as PrismaService;

    configServiceMock = {
      get: jest.fn((key: string) => {
        const config = {
          'jwt.expiresIn': 3600,
          'refreshToken.length': 64,
          'refreshToken.expiresIn': 604800,
        };
        return config[key];
      }),
    } as unknown as ConfigService;

    tokenService = new TokenService(
      configServiceMock as unknown as ConfigService,
      prismaMock as unknown as PrismaService,
      jwtServiceMock as unknown as JwtService,
    );
  });

  describe('createAccessToken', () => {
    it('should create access token and refresh token for a user', async () => {
      const jwtService = jwtServiceMock as unknown as JwtService;
      const prisma = prismaMock as unknown as PrismaService;
      const configService = configServiceMock as unknown as ConfigService;

      const user: User = {
        id: 'user-id',
        email: 'jonh.doe@example.com',
        username: 'john.doe',
        subscriberId: BigInt(123),
        staffMemberId: null,
      } as unknown as User;

      (jwtService.signAsync as jest.Mock).mockResolvedValue(
        'valid-access-token',
      );

      (configService.get as jest.Mock).mockImplementation((key: string) => {
        const config = {
          'jwt.expiresIn': 3600,
          'refreshToken.length': 64,
          'refreshToken.expiresIn': 604800,
        };
        return config[key];
      });

      tokenService['createRefreshToken'] = jest
        .fn()
        .mockReturnValue(
          'valid-refresh-token-for-general-purpose-and-user-access-only-use',
        );

      tokenService['hashToken'] = jest
        .fn()
        .mockReturnValue('hashed-refresh-token');

      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({
        accessToken: 'valid-access-token',
        refreshToken: 'hashed-refresh-token',
        expiresIn: configService.get<number>('jwt.expiresIn'),
      });

      const result = await tokenService.createAccessToken(user);

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: user.id,
          email: user.email,
          username: user.username,
        }),
        expect.objectContaining({ expiresIn: expect.any(Number) }),
      );

      expect(prisma.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            user: { connect: { id: user.id } },
            hashedToken: 'hashed-refresh-token',
            expiresAt: expect.any(Date),
          }),
        }),
      );

      expect(result).toEqual(
        expect.objectContaining({
          accessToken: 'valid-access-token',
          refreshToken:
            'valid-refresh-token-for-general-purpose-and-user-access-only-use',
          expiresIn: expect.any(Number),
        }),
      );
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh access token using a valid refresh token', async () => {
      const prisma = prismaMock as unknown as PrismaService;
      const jwtService = jwtServiceMock as unknown as JwtService;
      const configService = configServiceMock as unknown as ConfigService;

      tokenService['hashToken'] = jest
        .fn()
        .mockReturnValue('hashed-refresh-token');

      (prisma.refreshToken.findFirst as jest.Mock).mockResolvedValue({
        id: BigInt(1),
        hashedToken: 'hashed-refresh-token',
        revoked: false,
        userAgent: null,
        operatingSystem: null,
        expiresAt: new Date(Date.now() + 60 * 1000), // valid for 1 minute
        createdAt: new Date(),
        userId: 'user-id',
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-id',
        email: 'jonh.doe@example.com',
        username: 'john.doe',
        subscriberId: BigInt(123),
        staffMemberId: null,
      } as unknown as User);

      (configService.get as jest.Mock).mockImplementation((key: string) => {
        const config = {
          'jwt.expiresIn': 3600,
          'refreshToken.length': 64,
          'refreshToken.expiresIn': 604800,
        };
        return config[key];
      });

      (jwtService.signAsync as jest.Mock).mockResolvedValue(
        'new-valid-access-token',
      );

      const result = await tokenService.refreshAccessToken(
        'user-id',
        'valid-refresh-token-for-general-purpose-and-user-access-only-use',
      );

      expect(prisma.refreshToken.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-id',
            hashedToken: 'hashed-refresh-token',
            revoked: false,
            expiresAt: { gt: expect.any(Date) },
          }),
        }),
      );

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        select: {
          id: true,
          email: true,
          username: true,
          subscriberId: true,
          staffMemberId: true,
        },
        where: { id: 'user-id' },
      });

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'user-id',
          email: 'jonh.doe@example.com',
          username: 'john.doe',
        }),
        expect.objectContaining({ expiresIn: expect.any(Number) }),
      );

      expect(result).toEqual(
        expect.objectContaining({
          accessToken: 'new-valid-access-token',
          refreshToken:
            'valid-refresh-token-for-general-purpose-and-user-access-only-use',
          expiresIn: expect.any(Number),
        }),
      );
    });

    it('should throw BadRequestException for invalid or revoked refresh token', async () => {
      const prisma = prismaMock as unknown as PrismaService;

      tokenService['hashToken'] = jest
        .fn()
        .mockReturnValue('hashed-refresh-token');

      (prisma.refreshToken.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        tokenService.refreshAccessToken(
          'user-id',
          'invalid-refresh-token-for-general-purpose-and-user-access-only-use',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for refresh token that does not belong to the specified user', async () => {
      const prisma = prismaMock as unknown as PrismaService;

      (prisma.refreshToken.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        tokenService.refreshAccessToken(
          'jane-user-id',
          'valid-refresh-token-for-general-purpose-and-user-access-only-use',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for expired refresh token', async () => {
      const prisma = prismaMock as unknown as PrismaService;

      (prisma.refreshToken.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        tokenService.refreshAccessToken(
          'user-id',
          'expired-refresh-token-for-general-purpose-and-user-access-only-use',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if no user found for the provided refresh token', async () => {
      const prisma = prismaMock as unknown as PrismaService;

      (prisma.refreshToken.findFirst as jest.Mock).mockResolvedValue({
        id: BigInt(1),
        hashedToken: 'hashed-refresh-token',
        revoked: false,
        userAgent: null,
        operatingSystem: null,
        expiresAt: new Date(Date.now() + 60 * 1000), // expires in 1 minute
        createdAt: new Date(),
        userId: 'user-id',
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        tokenService.refreshAccessToken(
          'user-id',
          'valid-refresh-token-for-general-purpose-and-user-access-only-use',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('revokeRefreshToken', () => {
    it('should revoke a specific refresh token for a user', async () => {
      const prisma = prismaMock as unknown as PrismaService;

      tokenService['hashToken'] = jest
        .fn()
        .mockReturnValue('hashed-refresh-token');

      (prisma.refreshToken.findFirstOrThrow as jest.Mock).mockResolvedValue({
        id: BigInt(1),
        hashedToken: 'hashed-refresh-token',
        revoked: false,
        userAgent: null,
        operatingSystem: null,
        expiresAt: new Date(Date.now() + 60 * 1000), // expires in 1 minute
        createdAt: new Date(),
        userId: 'user-id',
      });

      (prisma.refreshToken.update as jest.Mock).mockResolvedValue({
        id: BigInt(1),
        hashedToken: 'hashed-refresh-token',
        revoked: true,
        userAgent: null,
        operatingSystem: null,
        expiresAt: new Date(Date.now() + 60 * 1000), // expires in 1 minute
        createdAt: new Date(),
        userId: 'user-id',
      });

      const result = await tokenService.revokeRefreshToken(
        'user-id',
        'valid-refresh-token-for-general-purpose-and-user-access-only-use',
      );

      expect(prisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: BigInt(1) },
          data: expect.objectContaining({ revoked: true }),
        }),
      );

      expect(result).toEqual({
        message: 'Refresh token revoked successfully',
      });
    });

    it('should throw NotFoundException for invalid or already revoked refresh token', async () => {
      const prisma = prismaMock as unknown as PrismaService;

      tokenService['hashToken'] = jest
        .fn()
        .mockReturnValue('hashed-refresh-token');

      (prisma.refreshToken.findFirstOrThrow as jest.Mock).mockRejectedValue({
        code: 'P2025',
      });

      await expect(
        tokenService.revokeRefreshToken(
          'user-id',
          'invalid-refresh-token-for-general-purpose-and-user-access-only-use',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for refresh token that does not belong to the specified user', async () => {
      const prisma = prismaMock as unknown as PrismaService;

      (prisma.refreshToken.findFirstOrThrow as jest.Mock).mockRejectedValue({
        code: 'P2025',
      });

      await expect(
        tokenService.revokeRefreshToken(
          'jane-user-id',
          'valid-refresh-token-for-general-purpose-and-user-access-only-use',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('revokeAllRefreshTokens', () => {
    it('should revoke all refresh tokens for a user', async () => {
      const prisma = prismaMock as unknown as PrismaService;

      (prisma.refreshToken.updateMany as jest.Mock).mockResolvedValue({
        count: 3,
      });

      const result = await tokenService.revokeAllRefreshTokens('user-id');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-id',
            revoked: false,
            expiresAt: { gt: expect.any(Date) },
          }),
          data: expect.objectContaining({ revoked: true }),
        }),
      );

      expect(result).toEqual({
        message: 'All refresh tokens revoked successfully',
      });
    });

    it('should throw NotFoundException if no valid refresh tokens found for the user', async () => {
      const prisma = prismaMock as unknown as PrismaService;

      (prisma.refreshToken.updateMany as jest.Mock).mockResolvedValue({
        count: 0,
      });
      await expect(
        tokenService.revokeAllRefreshTokens('user-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if user has no refresh tokens', async () => {
      const prisma = prismaMock as unknown as PrismaService;

      (prisma.refreshToken.updateMany as jest.Mock).mockResolvedValue({
        count: 0,
      });
      await expect(
        tokenService.revokeAllRefreshTokens('user-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
