import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { AccessTokenService } from './access-token.service';
import { SimpleHashService } from 'src/common/services/simple-hash/simple-hash.service';
import { SimpleTokenService } from 'src/common/services/simple-token/simple-token.service';
import { ConfigService } from '@nestjs/config';
import { User } from 'src/generated/prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('AccessTokenService', () => {
  let accessTokenService: AccessTokenService;
  let prismaMock: PrismaService;
  let configServiceMock: ConfigService;
  let jwtServiceMock: JwtService;
  let simpleHashServiceMock: SimpleHashService;
  let simpleTokenServiceMock: SimpleTokenService;

  const configValues: Record<string, number> = {
    'jwt.expiresIn': 3600,
    'refreshToken.length': 64,
    'refreshToken.expiresIn': 604800,
  };

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
      get: jest.fn((key: string) => configValues[key]),
    } as unknown as ConfigService;

    simpleHashServiceMock = {
      hash: jest.fn((raw: string) => `hashed(${raw})`),
      verify: jest.fn(),
    } as unknown as SimpleHashService;

    simpleTokenServiceMock = {
      generate: jest.fn(() => 'generated-refresh-token'),
    } as unknown as SimpleTokenService;

    accessTokenService = new AccessTokenService(
      configServiceMock,
      prismaMock,
      jwtServiceMock,
      simpleHashServiceMock,
      simpleTokenServiceMock,
    );
  });

  describe('generate', () => {
    it('should sign an access token and create a persisted refresh token for the user', async () => {
      const user = {
        id: 'user-id',
        email: 'jonh.doe@example.com',
        username: 'john.doe',
        role: 'SUBSCRIBER',
      } as unknown as User;

      (jwtServiceMock.signAsync as jest.Mock).mockResolvedValue(
        'valid-access-token',
      );

      const result = await accessTokenService.generate(user);

      expect(jwtServiceMock.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
        }),
        expect.objectContaining({ expiresIn: 3600 }),
      );

      // the raw refresh token length is driven by config, not hardcoded
      expect(simpleTokenServiceMock.generate).toHaveBeenCalledWith(64);

      expect(prismaMock.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            user: { connect: { id: user.id } },
            hashedToken: 'hashed(generated-refresh-token)',
            expiresAt: expect.any(Date),
          }),
        }),
      );

      expect(result).toEqual({
        accessToken: 'valid-access-token',
        refreshToken: 'generated-refresh-token',
        expiresIn: 3600,
      });
    });
  });

  describe('refresh', () => {
    it('should rotate a valid refresh token and return new tokens', async () => {
      (prismaMock.refreshToken.findFirst as jest.Mock).mockResolvedValue({
        id: 'token-id',
        hashedToken: 'hashed(valid-refresh-token)',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 60 * 1000),
        createdAt: new Date(),
        userId: 'user-id',
      });

      (prismaMock.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-id',
        email: 'jonh.doe@example.com',
        username: 'john.doe',
        role: 'SUBSCRIBER',
      });

      (jwtServiceMock.signAsync as jest.Mock).mockResolvedValue(
        'new-valid-access-token',
      );

      const result = await accessTokenService.refresh('valid-refresh-token');

      expect(prismaMock.refreshToken.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            hashedToken: 'hashed(valid-refresh-token)',
            expiresAt: { gt: expect.any(Date) },
          }),
        }),
      );

      // old token gets revoked as part of the rotation
      expect(prismaMock.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'token-id' },
        data: { isRevoked: true },
      });

      expect(result).toEqual({
        accessToken: 'new-valid-access-token',
        refreshToken: 'generated-refresh-token',
        expiresIn: 3600,
      });
    });

    it('should throw BadRequestException for a refresh token that does not match any record', async () => {
      (prismaMock.refreshToken.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        accessTokenService.refresh('unknown-refresh-token'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for an expired refresh token', async () => {
      // an expired token is simply excluded by the expiresAt filter, so
      // Prisma returns null just like an unknown token
      (prismaMock.refreshToken.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        accessTokenService.refresh('expired-refresh-token'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should detect reuse of an already-revoked token and revoke all sessions for that user', async () => {
      (prismaMock.refreshToken.findFirst as jest.Mock).mockResolvedValue({
        id: 'token-id',
        hashedToken: 'hashed(stolen-refresh-token)',
        isRevoked: true,
        expiresAt: new Date(Date.now() + 60 * 1000),
        createdAt: new Date(),
        userId: 'user-id',
      });

      (prismaMock.refreshToken.updateMany as jest.Mock).mockResolvedValue({
        count: 2,
      });

      await expect(
        accessTokenService.refresh('stolen-refresh-token'),
      ).rejects.toThrow(BadRequestException);

      expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-id' }),
          data: { isRevoked: true },
        }),
      );

      // a reused token must never be allowed to mint new tokens
      expect(jwtServiceMock.signAsync).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if no user is found for the token', async () => {
      (prismaMock.refreshToken.findFirst as jest.Mock).mockResolvedValue({
        id: 'token-id',
        hashedToken: 'hashed(valid-refresh-token)',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 60 * 1000),
        createdAt: new Date(),
        userId: 'user-id',
      });

      (prismaMock.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        accessTokenService.refresh('valid-refresh-token'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('revoke', () => {
    it('should revoke a specific refresh token for a user', async () => {
      (prismaMock.refreshToken.findFirstOrThrow as jest.Mock).mockResolvedValue(
        {
          id: 'token-id',
          hashedToken: 'hashed(valid-refresh-token)',
          isRevoked: false,
          expiresAt: new Date(Date.now() + 60 * 1000),
          createdAt: new Date(),
          userId: 'user-id',
        },
      );

      const result = await accessTokenService.revoke(
        'user-id',
        'valid-refresh-token',
      );

      expect(prismaMock.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'token-id' },
        data: { isRevoked: true },
      });

      expect(result).toEqual({
        message: 'Refresh token revoked successfully',
      });
    });

    it('should throw NotFoundException for an invalid, already revoked, or foreign refresh token', async () => {
      (prismaMock.refreshToken.findFirstOrThrow as jest.Mock).mockRejectedValue(
        { code: 'P2025' },
      );

      await expect(
        accessTokenService.revoke('user-id', 'invalid-refresh-token'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('revokeAll', () => {
    it('should revoke all refresh tokens for a user', async () => {
      (prismaMock.refreshToken.updateMany as jest.Mock).mockResolvedValue({
        count: 3,
      });

      const result = await accessTokenService.revokeAll('user-id');

      expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-id',
            isRevoked: false,
            expiresAt: { gt: expect.any(Date) },
          }),
          data: { isRevoked: true },
        }),
      );

      expect(result).toEqual({
        message: 'All refresh tokens revoked successfully',
      });
    });

    it('should throw NotFoundException if no valid refresh tokens are found for the user', async () => {
      (prismaMock.refreshToken.updateMany as jest.Mock).mockResolvedValue({
        count: 0,
      });

      await expect(accessTokenService.revokeAll('user-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
