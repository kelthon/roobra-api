import { ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { JWTAuthPayload } from 'src/shared/interfaces/jwt-auth-payload';

/**
 * Reads the JWT payload Passport attached to the request (`request.user`),
 * if any. Guards/decorators that need to know who's making the request
 * (or whether anyone is) should go through this instead of reaching into
 * `context.switchToHttp().getRequest()` on their own.
 */
export function getJwtPayload(
  context: ExecutionContext,
): JWTAuthPayload | undefined {
  const request = context.switchToHttp().getRequest<Request>();
  return (request?.user as JWTAuthPayload | undefined) ?? undefined;
}
