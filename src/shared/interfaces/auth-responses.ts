import { User } from 'src/generated/prisma/client';

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface SuccessAuthenticationResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user?: Partial<
    Omit<User, 'hashedPassword' | 'googleId' | 'role' | 'deletedAt'>
  >;
}
