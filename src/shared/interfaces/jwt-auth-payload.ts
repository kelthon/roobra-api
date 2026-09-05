import { UserRole } from 'src/generated/prisma/enums';

export interface JWTAuthPayload {
  sub: string;
  email: string;
  username: string;
  role: UserRole;
}
