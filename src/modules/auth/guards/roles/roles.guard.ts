import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { Roles } from '@app/common/decorators/auth/roles.decorator.js';
import { getJwtPayload } from '@app/common/utils/jwt/jwt.util.js';

/**
 * A route without `@Roles()` is open to everyone. Registered in `AuthModule`
 * but not applied to any route yet.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const roles = this.reflector.get(Roles, context.getHandler());

    if (!roles) {
      return true;
    }

    const rolesList = Array.isArray(roles) ? roles : [roles];
    const user = getJwtPayload(context);

    return !!user && rolesList.includes(user.role);
  }
}
