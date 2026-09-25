import { User } from 'src/generated/prisma/client.js';

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  /** Seconds until the access token expires */
  expiresIn: number;
}

export interface SuccessAuthenticationResponse extends AuthTokensResponse {
  user?: Partial<Pick<User, 'id' | 'username' | 'email' | 'photoUrl'>>;
}
