import { UserRole } from 'src/generated/prisma/enums';

export interface AuthPayload {
  sub: string;
  email: string;
  username: string;
  role: UserRole;
}
