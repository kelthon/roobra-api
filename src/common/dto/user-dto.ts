import { JWTAuthPayload } from '@app/shared/interfaces/jwt-auth-payload.js';

export type UserDto = Omit<JWTAuthPayload, 'sub'> & {
  id: string;
};
