import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthPayload } from 'src/shared/interfaces/auth-payload';

@Injectable()
export class ForbidAuthenticatedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthPayload | undefined;

    if (user?.sub) {
      throw new ForbiddenException('Already authenticated');
    }
    return true;
  }
}
