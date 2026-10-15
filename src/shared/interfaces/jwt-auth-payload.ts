import { UserRole } from '@app/db/prisma/enums.js';

export interface JWTAuthPayload {
  /** The user's nano id */
  sub: string;
  email: string;
  username: string;
  role: UserRole;
}
