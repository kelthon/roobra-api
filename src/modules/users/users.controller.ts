import { Controller, Delete, Get, HttpCode, Query } from '@nestjs/common';
import { User } from '@app/common/decorators/user-param/user-param.decorator.js';
import { Authenticated } from '@app/common/decorators/auth/authenticated.decorator.js';
import { type UserDto } from '@app/common/dto/user-dto.js';
import { UsersService } from './users.service.js';
import { ListUsersQueryDto } from './dto/list-users-query.dto.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Authenticated()
  @Get('me')
  async getMe(@User() user: UserDto) {
    return await this.usersService.getMe(user.id);
  }

  /**
   * Deletes the signed-in user's account and signs it out of every session.
   *
   * @param user The signed-in user
   */
  @Authenticated()
  @Delete('me')
  @HttpCode(204)
  async delete(@User() user: UserDto): Promise<void> {
    await this.usersService.delete(user.id);
  }

  @Authenticated('ADMIN', 'SUPPORT_AGENT')
  @Get()
  list(@Query() params: ListUsersQueryDto) {
    return this.usersService.list(params);
  }
}
