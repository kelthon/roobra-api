import type { PrismaClient, User } from '../../src/generated/prisma/client';
import { UserRole } from '../../src/generated/prisma/enums';

interface UserSeeds {
  viewer: User;
  guest: User;
  staff: User;
  admin: User;
}

export async function seedUsers(
  prisma: PrismaClient,
  hashedPassword: string,
): Promise<UserSeeds> {
  const [viewer, guest] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'viewer@ph.test' },
      create: {
        email: 'viewer@ph.test',
        username: 'viewer',
        hashedPassword,
        role: UserRole.SUBSCRIBER,
      },
      update: { username: 'viewer', hashedPassword },
    }),
    prisma.user.upsert({
      where: { email: 'guest@ph.test' },
      create: {
        email: 'guest@ph.test',
        username: 'guest',
        hashedPassword,
        role: UserRole.SUBSCRIBER,
      },
      update: { username: 'guest', hashedPassword },
    }),
  ]);

  // Staff users use nested create on first run to set up the StaffMember relation.
  // On subsequent runs the update path leaves staffMember unchanged.
  const staff = await prisma.user.upsert({
    where: { email: 'staff@ph.test' },
    create: {
      email: 'staff@ph.test',
      username: 'staff',
      hashedPassword,
      role: UserRole.CONTENT_STAFF,
      staffMember: { create: { isActive: true } },
    },
    update: { username: 'staff', hashedPassword },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@ph.test' },
    create: {
      email: 'admin@ph.test',
      username: 'admin',
      hashedPassword,
      role: UserRole.ADMIN,
      staffMember: { create: { isActive: true } },
    },
    update: { username: 'admin', hashedPassword },
  });

  console.log('- Users: viewer, guest, staff (CONTENT_STAFF), admin (ADMIN)');
  return { viewer, guest, staff, admin };
}
