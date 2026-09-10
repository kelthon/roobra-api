import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserDto } from '../dto/user-dto';
import { getJwtPayload } from '../utils/jwt-payload.util';

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
