import type { PrismaClient, User } from '../../src/generated/prisma/client.js';
import { UserRole } from '../../src/generated/prisma/enums.js';

interface UserSeeds {
  subscriber: User;
  guest: User;
  staff: User;
  admin: User;
}

export async function seedUsers(
  prisma: PrismaClient,
  hashedPassword: string,
): Promise<UserSeeds> {
  const [subscriber, guest] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'subscriber@roobra.test' },
      create: {
        email: 'subscriber@roobra.test',
        username: 'subscriber',
        hashedPassword,
        role: UserRole.SUBSCRIBER,
      },
      update: { username: 'subscriber', hashedPassword },
    }),
    prisma.user.upsert({
      where: { email: 'guest@roobra.test' },
      create: {
        email: 'guest@roobra.test',
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
    where: { email: 'staff@roobra.test' },
    create: {
      email: 'staff@roobra.test',
      username: 'staff',
      hashedPassword,
      role: UserRole.CONTENT_MANAGER,
      staffMember: { create: { isActive: true } },
    },
    update: { username: 'staff', hashedPassword },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@roobra.test' },
    create: {
      email: 'admin@roobra.test',
      username: 'admin',
      hashedPassword,
      role: UserRole.ADMIN,
      staffMember: { create: { isActive: true } },
    },
    update: { username: 'admin', hashedPassword },
  });

  console.log(
    '- Users: subscriber, guest, staff (CONTENT_MANAGER), admin (ADMIN)',
  );
  return { subscriber, guest, staff, admin };
}
