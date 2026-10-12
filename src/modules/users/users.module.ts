import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { SessionsModule } from '../sessions/sessions.module.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [DatabaseModule, SessionsModule],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
