import { Injectable, UnauthorizedException } from '@nestjs/common';
import { isRecordNotFoundError } from '@app/common/utils/database/database.util.js';
import { PagedResponse } from '@app/interfaces/paged-response.interface.js';
import { PrismaService } from '@app/modules/database/prisma.service.js';
import { SessionsService } from '@app/modules/sessions/sessions.service.js';
import { User } from '@app/db/prisma/client.js';

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
   * @throws UnauthorizedException When the signed-in user no longer exists
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
        where: { id: userId },
      });

      return user;
    } catch (error: unknown) {
      if (isRecordNotFoundError(error)) {
        throw new UnauthorizedException('The signed-in user no longer exists');
      }
      throw error;
    }
  }

  /**
   * Soft-deletes the user and revokes every session in the same transaction.
   * An access token already issued stays valid until it expires.
   *
   * @param userId The user nano id
   * @throws UnauthorizedException When the signed-in user no longer exists
   */
  async delete(userId: string): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.user.softDelete({ id: userId });

        await this.sessionsService.revokeAll(userId, tx);
      });
    } catch (error: unknown) {
      if (isRecordNotFoundError(error)) {
        throw new UnauthorizedException('The signed-in user no longer exists');
      }

      throw error;
    }
  }

  async list(): Promise<PagedResponse<Partial<User>>> {
    const [users, total] = await this.prisma.user.findManyAndCount({
      select: {
        username: true,
        email: true,
        createdAt: true,
      },
      skip: 0,
      take: 10,
      orderBy: [{ updatedAt: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });

    return {
      data: users,
      meta: {
        paginationType: 'page',
        page: 1,
        limit: 10,
        totalPages: 10,
        totalItems: total,
        nextPageURI: undefined,
        previousPageURI: undefined,
      },
    };
  }
}
