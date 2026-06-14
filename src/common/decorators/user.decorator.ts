import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { UserDto } from '../dto/user-dto';
import { AuthPayload } from 'src/shared/interfaces/auth-payload';

export const User = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<Request>();
    const userPayload = request?.user as AuthPayload | undefined;
    const user = userPayload
      ? ({
          id: userPayload.sub ?? null,
          email: userPayload.email ?? null,
          subscriberId: userPayload.subscriberId ?? undefined,
          staffMemberId: userPayload.staffMemberId ?? undefined,
        } as UserDto)
      : undefined;
    return user;
  },
);
