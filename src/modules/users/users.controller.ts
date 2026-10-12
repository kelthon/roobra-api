import { Controller, Delete, Get, HttpCode } from '@nestjs/common';
import { User } from 'src/common/decorators/user.decorator.js';
import { UserOnly } from 'src/common/decorators/user-only.decorator.js';
import { type UserDto } from 'src/common/dto/user-dto.js';
import { UsersService } from './users.service.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UserOnly()
  @Get('me')
  async getMe(@User() user: UserDto) {
    return await this.usersService.getMe(user.id);
  }

  /**
   * Deletes the signed-in user's account and signs it out of every session.
   *
   * @param user The signed-in user
   */
  @UserOnly()
  @Delete('me')
  @HttpCode(204)
  async delete(@User() user: UserDto): Promise<void> {
    await this.usersService.delete(user.id);
  }
}
