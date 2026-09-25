import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JWTAuthPayload } from 'src/shared/interfaces/jwt-auth-payload.js';

/**
 * A missing or invalid token leaves the request unauthenticated instead of
 * failing.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<T = JWTAuthPayload>(
    _err: Error | null,
    payload: T | false,
  ): T | undefined {
    return payload || undefined;
  }
}
