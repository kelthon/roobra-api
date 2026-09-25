import { JWTAuthPayload } from 'src/shared/interfaces/jwt-auth-payload.js';

export type UserDto = Omit<JWTAuthPayload, 'sub'> & {
  id: string;
};
