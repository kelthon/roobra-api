import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { SetRoles } from '@app/common/decorators/auth/set-roles.decorator.js';
import { getJwtPayload } from '@app/common/utils/jwt/jwt.util.js';

/**
 * A route without `@SetRoles()` is open to everyone. Registered in `AuthModule`
 * but not applied to any route yet.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const roles = this.reflector.get(SetRoles, context.getHandler());

    if (!roles) {
      return true;
    }

    const rolesList = Array.isArray(roles) ? roles : [roles];
    const user = getJwtPayload(context);

    return !!user && rolesList.includes(user.role);
  }
}
