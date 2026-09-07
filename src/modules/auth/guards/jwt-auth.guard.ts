import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JWTAuthPayload } from 'src/shared/interfaces/jwt-auth-payload';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

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
