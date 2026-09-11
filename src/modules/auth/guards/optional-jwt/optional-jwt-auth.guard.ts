import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JWTAuthPayload } from 'src/shared/interfaces/jwt-auth-payload';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<T = JWTAuthPayload>(
    _err: Error | null,
    payload: T | false,
  ): T | undefined {
    return payload || undefined;
  }
}
