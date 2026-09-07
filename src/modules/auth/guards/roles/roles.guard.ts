import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JWTAuthPayload } from 'src/shared/interfaces/jwt-auth-payload';

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
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request?.user as unknown as JWTAuthPayload) ?? null;

    return user && rolesList.includes(user.role);
  }
}
