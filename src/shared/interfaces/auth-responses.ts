import { User } from 'src/generated/prisma/client';

export default interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user?: Partial<
    Omit<
      User,
      | 'id'
      | 'hashedPassword'
      | 'emailVerifiedAt'
      | 'googleId'
      | 'role'
      | 'deletedAt'
    >
  >;
}
