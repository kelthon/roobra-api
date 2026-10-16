import { Injectable, UnauthorizedException } from '@nestjs/common';
import { isRecordNotFoundError } from '@app/common/utils/database/database.util.js';
import { PrismaService } from '@app/modules/database/prisma.service.js';
import { SessionsService } from '@app/modules/sessions/sessions.service.js';
import { UserPaginationParamsDto } from './dto/user-pagination-params.dto.js';
import {
  buildPageMeta,
  offsetBasedPagination,
  parseOrderByParams,
} from '@app/common/utils/pagination/pagination.util.js';

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

  /**
   * Lists one page of users, for the staff.
   *
   * @param query The page, its size and the order, validated with defaults
   */
  async list(query: UserPaginationParamsDto) {
    const [users, totalItems] = await this.prisma.user.findManyAndCount({
      select: {
        username: true,
        email: true,
        createdAt: true,
      },
      orderBy: parseOrderByParams(query.orderBy),
      ...offsetBasedPagination(query.page, query.limit),
    });

    return { data: users, meta: buildPageMeta(query, totalItems) };
  }
}
