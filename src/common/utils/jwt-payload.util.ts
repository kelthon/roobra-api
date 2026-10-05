import { ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { JWTAuthPayload } from 'src/shared/interfaces/jwt-auth-payload';

/**
 * Reads the payload Passport attached to `request.user`, if any. Guards and
 * decorators read the user through this instead of the raw request.
 *
 * @param context The request context
 */
export function getJwtPayload(
  context: ExecutionContext,
): JWTAuthPayload | undefined {
  const request = context.switchToHttp().getRequest<Request>();
  return (request?.user as JWTAuthPayload | undefined) ?? undefined;
}
