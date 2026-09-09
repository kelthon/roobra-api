import { User } from 'src/generated/prisma/client';

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface SuccessAuthenticationResponse extends AuthTokensResponse {
  user?: Partial<Pick<User, 'id' | 'username' | 'email' | 'photoUrl'>>;
}
