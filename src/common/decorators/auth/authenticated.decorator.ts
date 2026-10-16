import { applyDecorators, UseGuards } from '@nestjs/common';
import { RolesGuard } from '@app/modules/auth/guards/roles/roles.guard.js';
import { JwtAuthGuard } from '@app/modules/auth/guards/jwt-auth/jwt-auth.guard.js';
import { UserRole } from '@app/db/prisma/enums.js';
import { SetRoles } from './set-roles.decorator.js';

/**
 * Restricts a route to signed-in users and, when roles are given, to users
 * with one of them. Without roles it only checks the access token, so
 * `RolesGuard` does not run.
 *
 * @param roles The roles allowed on the route; any role when there is none
 */
export function Authenticated(...roles: UserRole[]) {
  return roles.length
    ? applyDecorators(UseGuards(JwtAuthGuard, RolesGuard), SetRoles(roles))
    : applyDecorators(UseGuards(JwtAuthGuard));
}
