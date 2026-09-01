import { Reflector } from '@nestjs/core';
import { UserRole } from 'src/generated/prisma/enums';

export const Roles = Reflector.createDecorator<UserRole | UserRole[]>();
