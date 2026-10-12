import { BadRequestException } from '@nestjs/common';
import type { Mock } from 'vitest';
import { PrismaService } from 'src/modules/database/prisma.service.js';
import { UsersService } from './users.service.js';

describe('UsersService', () => {
  let usersService: UsersService;
  let prismaMock: PrismaService;

  beforeEach(() => {
    prismaMock = {
      user: { findUniqueOrThrow: vi.fn() },
    } as unknown as PrismaService;

    usersService = new UsersService(prismaMock);
  });

  describe('getMe', () => {
    it('should return the user profile for a given id', async () => {
      const profile = {
        id: 'user-id',
        email: 'john.doe@example.com',
        username: 'john.doe',
      };
      (prismaMock.user.findUniqueOrThrow as Mock).mockResolvedValue(profile);

      const result = await usersService.getMe('user-id');

      expect(prismaMock.user.findUniqueOrThrow).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-id', deletedAt: null },
        }),
      );
      expect(result).toBe(profile);
    });

    it('should throw BadRequestException if no user is found', async () => {
      (prismaMock.user.findUniqueOrThrow as Mock).mockRejectedValue({
        code: 'P2025',
      });

      await expect(usersService.getMe('missing-id')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
