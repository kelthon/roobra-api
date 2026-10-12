import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Mock } from 'vitest';
import { PrismaService } from 'src/modules/database/prisma.service.js';
import { SessionsService } from 'src/modules/sessions/sessions.service.js';
import { UsersService } from './users.service.js';

describe('UsersService', () => {
  let usersService: UsersService;
  let prismaMock: PrismaService;
  let sessionsServiceMock: SessionsService;
  let txMock: { user: { update: Mock } };

  beforeEach(() => {
    txMock = { user: { update: vi.fn() } };

    prismaMock = {
      user: { findUniqueOrThrow: vi.fn() },
      $transaction: vi.fn((callback: (tx: unknown) => unknown) =>
        callback(txMock),
      ),
    } as unknown as PrismaService;

    sessionsServiceMock = {
      revokeAll: vi.fn().mockResolvedValue(0),
    } as unknown as SessionsService;

    usersService = new UsersService(prismaMock, sessionsServiceMock);
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

  describe('delete', () => {
    it('should soft-delete the user and revoke its sessions in one transaction', async () => {
      await usersService.delete('user-id');

      expect(txMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id', deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      });
      expect(sessionsServiceMock.revokeAll).toHaveBeenCalledWith(
        'user-id',
        txMock,
      );
    });

    it('should delete a user that has no active session', async () => {
      (sessionsServiceMock.revokeAll as Mock).mockResolvedValue(0);

      await expect(usersService.delete('user-id')).resolves.toBeUndefined();
    });

    it('should throw NotFoundException when the user is missing or already deleted', async () => {
      txMock.user.update.mockRejectedValue({ code: 'P2025' });

      await expect(usersService.delete('user-id')).rejects.toThrow(
        NotFoundException,
      );
      expect(sessionsServiceMock.revokeAll).not.toHaveBeenCalled();
    });

    it('should rethrow any other database error', async () => {
      const error = new Error('connection lost');
      txMock.user.update.mockRejectedValue(error);

      await expect(usersService.delete('user-id')).rejects.toBe(error);
    });
  });
});
