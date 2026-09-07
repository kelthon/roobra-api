import { JWTAuthPayload } from 'src/shared/interfaces/jwt-auth-payload';

export type UserDto = Omit<JWTAuthPayload, 'sub'> & {
  id: string;
};
