import { JWTAuthPayload } from '@app/interfaces/jwt-auth-payload.js';

export type UserDto = Omit<JWTAuthPayload, 'sub'> & {
  id: string;
};
