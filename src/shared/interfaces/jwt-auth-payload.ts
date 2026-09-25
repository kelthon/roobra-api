import { UserRole } from 'src/generated/prisma/enums.js';

export interface JWTAuthPayload {
  /** The user's nano id */
  sub: string;
  email: string;
  username: string;
  role: UserRole;
}
