import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { getJwtPayload } from 'src/common/utils/jwt-payload.util';

@Injectable()
export class ForbidAuthenticatedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = getJwtPayload(context);

    if (user && user.sub) {
      throw new ForbiddenException('Already authenticated');
    }
    return true;
  }
}
