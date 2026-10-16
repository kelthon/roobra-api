import { JWTAuthPayload } from '@app/interfaces/jwt-auth-payload.interface.js';

export type UserDto = Omit<JWTAuthPayload, 'sub'> & {
  id: string;
};
