import { AuthPayload } from 'src/shared/interfaces/auth-payload';

export type UserDto = Omit<AuthPayload, 'sub'> & {
  id: string;
  username: string;
  email: string;
};
