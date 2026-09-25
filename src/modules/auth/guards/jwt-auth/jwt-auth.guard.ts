import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JWTAuthPayload } from 'src/shared/interfaces/jwt-auth-payload.js';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  /**
   * Returns the token payload, also rejecting a token without a `sub` claim.
   *
   * @param err The error Passport found, if any
   * @param payload The token payload, or false when there is none
   * @throws UnauthorizedException When the token is missing or invalid, or has
   *   no `sub` claim
   */
  handleRequest<T = JWTAuthPayload>(err: Error | null, payload: T | false): T {
    if (err || !payload) {
      throw err || new UnauthorizedException();
    }

    const authPayload = payload as unknown as JWTAuthPayload;

    if (!authPayload.sub) {
      throw new UnauthorizedException(
        'Invalid token payload: missing sub claim',
      );
    }

    return payload;
  }
}
