import { BadRequestException, Injectable } from '@nestjs/common';
import { isRecordNotFoundError } from 'src/common/utils/database.util.js';
import { PrismaService } from 'src/modules/database/prisma.service.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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
}
