import { User } from 'src/generated/prisma/client';

export default interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user?: Omit<
    User,
    | 'id'
    | 'hashedPassword'
    | 'emailVerifiedAt'
    | 'googleId'
    | 'subscriberId'
    | 'staffMemberId'
    | 'deletedAt'
  >;
}
