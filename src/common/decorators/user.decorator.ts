import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserDto } from '../dto/user-dto.js';
import { getJwtPayload } from '../utils/jwt-payload.util.js';

/**
 * Injects the authenticated user, with the token's `sub` claim as `id`.
 * Undefined on routes without a valid token.
 */
export const User = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const userPayload = getJwtPayload(context);
    const user = userPayload
      ? ({
          id: userPayload.sub ?? null,
          username: userPayload.username ?? null,
          email: userPayload.email ?? null,
          role: userPayload.role ?? null,
        } as UserDto)
      : undefined;
    return user;
  },
);
