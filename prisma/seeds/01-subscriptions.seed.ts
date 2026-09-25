import type {
  PrismaClient,
  Subscription,
} from '../../src/generated/prisma/client.js';
import { SUBSCRIPTION_IDS } from './constants.js';

interface SubscriptionSeeds {
  basic: Subscription;
  standard: Subscription;
  premium: Subscription;
}

export async function seedSubscriptions(
  prisma: PrismaClient,
): Promise<SubscriptionSeeds> {
  const [basic, standard, premium] = await Promise.all([
    prisma.subscription.upsert({
      where: { id: SUBSCRIPTION_IDS.BASIC },
      create: {
        id: SUBSCRIPTION_IDS.BASIC,
        name: 'Basic',
        price: 5.99,
        priceAnnual: 59.88,
        accessDays: 30,
      },
      update: {
        name: 'Basic',
        price: 5.99,
        priceAnnual: 59.88,
        accessDays: 30,
      },
    }),
    prisma.subscription.upsert({
      where: { id: SUBSCRIPTION_IDS.STANDARD },
      create: {
        id: SUBSCRIPTION_IDS.STANDARD,
        name: 'Standard',
        price: 9.9,
        priceAnnual: 99.0,
        accessDays: 30,
      },
      update: {
        name: 'Standard',
        price: 9.9,
        priceAnnual: 99.0,
        accessDays: 30,
      },
    }),
    prisma.subscription.upsert({
      where: { id: SUBSCRIPTION_IDS.PREMIUM },
      create: {
        id: SUBSCRIPTION_IDS.PREMIUM,
        name: 'Premium',
        price: 29.9,
        priceAnnual: 287.04,
        accessDays: 30,
      },
      update: {
        name: 'Premium',
        price: 29.9,
        priceAnnual: 287.04,
        accessDays: 30,
      },
    }),
  ]);

  console.log('- Subscriptions: Basic, Standard, Premium');
  return { basic, standard, premium };
}
