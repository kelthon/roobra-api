import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { getJwtPayload } from 'src/common/utils/jwt-payload.util.js';

@Injectable()
export class ForbidAuthenticatedGuard implements CanActivate {
  /**
   * Lets the request through only when it carries no valid access token.
   *
   * @param context The request context
   * @throws ForbiddenException When the request carries a valid access token
   */
  canActivate(context: ExecutionContext): boolean {
    const user = getJwtPayload(context);

    if (user && user.sub) {
      throw new ForbiddenException('Already authenticated');
    }
    return true;
  }
}
