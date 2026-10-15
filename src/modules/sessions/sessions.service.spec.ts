import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@app/modules/database/prisma.service.js';
import { SessionsService } from './sessions.service.js';
import { SimpleHashService } from '@app/common/services/simple-hash/simple-hash.service.js';
import { SimpleTokenService } from '@app/common/services/simple-token/simple-token.service.js';
import { ConfigService } from '@nestjs/config';
import { User } from '@app/db/prisma/client.js';
import { NotFoundException } from '@nestjs/common';
import type { Mock } from 'vitest';

describe('SessionsService', () => {
  let sessionsService: SessionsService;
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
      signAsync: vi.fn(),
      verifyAsync: vi.fn(),
    } as unknown as JwtService;

    prismaMock = {
      refreshToken: {
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        findFirst: vi.fn(),
        findFirstOrThrow: vi.fn(),
        findMany: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
    } as unknown as PrismaService;

    configServiceMock = {
      get: vi.fn((key: string) => configValues[key]),
    } as unknown as ConfigService;

    simpleHashServiceMock = {
      hash: vi.fn((raw: string) => `hashed(${raw})`),
      verify: vi.fn(),
    } as unknown as SimpleHashService;

    simpleTokenServiceMock = {
      generate: vi.fn(() => 'generated-refresh-token'),
    } as unknown as SimpleTokenService;

    sessionsService = new SessionsService(
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

      (jwtServiceMock.signAsync as Mock).mockResolvedValue(
        'valid-access-token',
      );

      const result = await sessionsService.generate(user);

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
      (prismaMock.refreshToken.findFirst as Mock).mockResolvedValue({
        id: 'token-id',
        hashedToken: 'hashed(valid-refresh-token)',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 60 * 1000),
        createdAt: new Date(),
        userId: 'user-id',
      });

      (prismaMock.user.findUnique as Mock).mockResolvedValue({
        id: 'user-id',
        email: 'jonh.doe@example.com',
        username: 'john.doe',
        role: 'SUBSCRIBER',
      });

      (jwtServiceMock.signAsync as Mock).mockResolvedValue(
        'new-valid-access-token',
      );

      const result = await sessionsService.refresh('valid-refresh-token');

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

    it('should throw an invalid-token problem for a refresh token that does not match any record', async () => {
      (prismaMock.refreshToken.findFirst as Mock).mockResolvedValue(null);

      await expect(
        sessionsService.refresh('unknown-refresh-token'),
      ).rejects.toMatchObject({ type: 'invalid-token' });
    });

    it('should throw an invalid-token problem for an expired refresh token', async () => {
      // an expired token is simply excluded by the expiresAt filter, so
      // Prisma returns null just like an unknown token
      (prismaMock.refreshToken.findFirst as Mock).mockResolvedValue(null);

      await expect(
        sessionsService.refresh('expired-refresh-token'),
      ).rejects.toMatchObject({ type: 'invalid-token' });
    });

    it('should detect reuse of an already-revoked token and revoke all sessions for that user', async () => {
      (prismaMock.refreshToken.findFirst as Mock).mockResolvedValue({
        id: 'token-id',
        hashedToken: 'hashed(stolen-refresh-token)',
        isRevoked: true,
        expiresAt: new Date(Date.now() + 60 * 1000),
        createdAt: new Date(),
        userId: 'user-id',
      });

      (prismaMock.refreshToken.updateMany as Mock).mockResolvedValue({
        count: 2,
      });

      await expect(
        sessionsService.refresh('stolen-refresh-token'),
      ).rejects.toMatchObject({ type: 'invalid-token' });

      expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-id' }),
          data: { isRevoked: true },
        }),
      );

      // a reused token must never be allowed to mint new tokens
      expect(jwtServiceMock.signAsync).not.toHaveBeenCalled();
    });

    it('should report token reuse even when the user has no other active session', async () => {
      (prismaMock.refreshToken.findFirst as Mock).mockResolvedValue({
        id: 'token-id',
        hashedToken: 'hashed(stolen-refresh-token)',
        isRevoked: true,
        expiresAt: new Date(Date.now() + 60 * 1000),
        createdAt: new Date(),
        userId: 'user-id',
      });

      (prismaMock.refreshToken.updateMany as Mock).mockResolvedValue({
        count: 0,
      });

      await expect(
        sessionsService.refresh('stolen-refresh-token'),
      ).rejects.toThrow('Refresh token rotation with reuse detected');
    });

    it('should throw NotFoundException if the user of the token is missing or deleted', async () => {
      (prismaMock.refreshToken.findFirst as Mock).mockResolvedValue({
        id: 'token-id',
        hashedToken: 'hashed(valid-refresh-token)',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 60 * 1000),
        createdAt: new Date(),
        userId: 'user-id',
      });

      (prismaMock.user.findUnique as Mock).mockResolvedValue(null);

      await expect(
        sessionsService.refresh('valid-refresh-token'),
      ).rejects.toThrow(NotFoundException);

      // a deleted user is filtered out like a missing one
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-id' },
        }),
      );
      expect(jwtServiceMock.signAsync).not.toHaveBeenCalled();
    });
  });

  describe('getActive', () => {
    it('should list the active sessions of the user, newest first, without tokens', async () => {
      const sessions = [{ userAgent: 'agent', createdAt: new Date() }];
      (prismaMock.refreshToken.findMany as Mock).mockResolvedValue(sessions);

      const result = await sessionsService.getActive('user-id');

      expect(prismaMock.refreshToken.findMany).toHaveBeenCalledWith({
        select: {
          userAgent: true,
          operatingSystem: true,
          expiresAt: true,
          createdAt: true,
        },
        where: {
          userId: 'user-id',
          isRevoked: false,
          expiresAt: { gt: expect.any(Date) },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toBe(sessions);
    });
  });

  describe('revoke', () => {
    it('should revoke a specific refresh token for a user', async () => {
      (prismaMock.refreshToken.findFirstOrThrow as Mock).mockResolvedValue({
        id: 'token-id',
        hashedToken: 'hashed(valid-refresh-token)',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 60 * 1000),
        createdAt: new Date(),
        userId: 'user-id',
      });

      const result = await sessionsService.revoke(
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
      (prismaMock.refreshToken.findFirstOrThrow as Mock).mockRejectedValue({
        code: 'P2025',
      });

      await expect(
        sessionsService.revoke('user-id', 'invalid-refresh-token'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('revokeAll', () => {
    it('should revoke all active refresh tokens of a user and return how many', async () => {
      (prismaMock.refreshToken.updateMany as Mock).mockResolvedValue({
        count: 3,
      });

      const result = await sessionsService.revokeAll('user-id');

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

      expect(result).toBe(3);
    });

    it('should return 0 instead of throwing when the user has no active token', async () => {
      (prismaMock.refreshToken.updateMany as Mock).mockResolvedValue({
        count: 0,
      });

      await expect(sessionsService.revokeAll('user-id')).resolves.toBe(0);
    });

    it('should run in the transaction it is given', async () => {
      const txMock = {
        refreshToken: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      };

      await sessionsService.revokeAll('user-id', txMock as never);

      expect(txMock.refreshToken.updateMany).toHaveBeenCalled();
      expect(prismaMock.refreshToken.updateMany).not.toHaveBeenCalled();
    });
  });
});
