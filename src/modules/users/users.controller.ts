import { Controller, Get } from '@nestjs/common';
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
}
