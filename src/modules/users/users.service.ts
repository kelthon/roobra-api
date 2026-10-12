import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DateTime } from 'luxon';
import { isRecordNotFoundError } from 'src/common/utils/database.util.js';
import { PrismaService } from 'src/modules/database/prisma.service.js';
import { SessionsService } from 'src/modules/sessions/sessions.service.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionsService: SessionsService,
  ) {}

  /**
   * Gets the profile of a user.
   *
   * @param userId The user nano id
   * @throws BadRequestException When the user does not exist
   */
  async getMe(userId: string) {
    try {
      const user = await this.prisma.user.findUniqueOrThrow({
        select: {
          id: true,
          email: true,
          username: true,
          birthdate: true,
          photoUrl: true,
          emailVerifiedAt: true,
          createdAt: true,
          updatedAt: true,
        },
        where: { id: userId, deletedAt: null },
      });

      return user;
    } catch (error: unknown) {
      if (isRecordNotFoundError(error)) {
        throw new BadRequestException('No user was found with provided id');
      }
      throw error;
    }
  }

  /**
   * Soft-deletes the user and revokes every session in the same transaction.
   * An access token already issued stays valid until it expires.
   *
   * @param userId The user nano id
   * @throws NotFoundException When the user does not exist or is already deleted
   */
  async delete(userId: string): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId, deletedAt: null },
          data: { deletedAt: DateTime.now().toJSDate() },
        });

        await this.sessionsService.revokeAll(userId, tx);
      });
    } catch (error: unknown) {
      if (isRecordNotFoundError(error)) {
        throw new NotFoundException('No user was found with provided id');
      }

      throw error;
    }
  }
}
