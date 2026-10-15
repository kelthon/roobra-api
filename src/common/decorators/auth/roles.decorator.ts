import { Reflector } from '@nestjs/core';
import { UserRole } from '@app/db/prisma/enums.js';

/**
 * Roles allowed on a route, checked by `RolesGuard`.
 */
export const Roles = Reflector.createDecorator<UserRole | UserRole[]>();
