import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { DEFAULT_PASSWORD } from './seeds/constants.js';
import { seedSubscriptions } from './seeds/01-subscriptions.seed.js';
import { seedUsers } from './seeds/02-users.seed.js';
import { seedContent } from './seeds/03-content.seed.js';
import { seedSubscribers } from './seeds/04-subscribers.seed.js';
import { seedInteractions } from './seeds/05-interactions.seed.js';
import { PasswordHashService } from 'src/modules/auth/services/password-hash/password-hash.service.js';

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// Each seed function is isolated so individual flows can be tested or extended independently.
// Order matters: subscriptions and users must exist before subscribers and interactions.
async function main(): Promise<void> {
  console.log('Seeding database...\n');

  const { premium } = await seedSubscriptions(prisma);
  const passwordHashService = new PasswordHashService();

  // The password is hashed once and reused across all users so the seed
  // doesn't call argon2 N times with different salts for no reason.
  const hashedPassword = await passwordHashService.hash(DEFAULT_PASSWORD);
  const { subscriber: subscriberUser } = await seedUsers(
    prisma,
    hashedPassword,
  );

  const { media, pages } = await seedContent(prisma);

  // Subscriber (billing record) is created after the user because it requires
  // a valid plan, and after content because its order item references the
  // subscription plan.
  const subscriber = await seedSubscribers(prisma, subscriberUser, premium);

  // Interactions depend on both the subscriber identity and the specific page
  // IDs from the content hierarchy, so they come last.
  await seedInteractions(prisma, subscriber, media, pages);

  console.log(
    `\nDone. Default password for all test accounts: ${DEFAULT_PASSWORD}`,
  );
}

void main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e: unknown) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
