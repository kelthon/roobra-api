import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { JWTAuthPayload } from 'src/shared/interfaces/jwt-auth-payload';

@Injectable()
export class ForbidAuthenticatedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as JWTAuthPayload | undefined;

    if (user && user.sub) {
      throw new ForbiddenException('Already authenticated');
    }
    return true;
  }
}
