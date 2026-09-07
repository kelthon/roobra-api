import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { UserDto } from '../dto/user-dto';
import { JWTAuthPayload } from 'src/shared/interfaces/jwt-auth-payload';

export const User = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<Request>();
    const userPayload = request?.user as JWTAuthPayload | undefined;
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
