import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { SetRoles } from '@app/common/decorators/auth/set-roles.decorator.js';
import { getJwtPayload } from '@app/common/utils/jwt/jwt.util.js';

/**
 * Lets a request through when the signed-in user has one of the roles set by
 * `@SetRoles()`. A route without roles, or with an empty list, is open to
 * every user who got past the guards before it. Applied by
 * `@Authenticated(...roles)` after `JwtAuthGuard`, which puts the user on
 * the request.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const roles = this.reflector.get(SetRoles, context.getHandler());

    if (!roles || (Array.isArray(roles) && roles.length === 0)) {
      return true;
    }

    const rolesList = Array.isArray(roles) ? roles : [roles];
    const user = getJwtPayload(context);

    return !!user && rolesList.includes(user.role);
  }
}
