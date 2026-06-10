import type {
  PrismaClient,
  Subscriber,
  Subscription,
  User,
} from '../../src/generated/prisma/client';
import { DateTime } from 'luxon';

export async function seedSubscribers(
  prisma: PrismaClient,
  viewer: User,
  premium: Subscription,
): Promise<Subscriber> {
  // Fetch the current viewer state in case a previous run already set subscriberId.
  const freshViewer = await prisma.user.findUniqueOrThrow({
    where: { id: viewer.id },
    select: { subscriberId: true },
  });

  if (freshViewer.subscriberId) {
    console.log('- Subscriber: already exists, skipping');
    return prisma.subscriber.findUniqueOrThrow({
      where: { id: freshViewer.subscriberId },
    });
  }

  const expirationDate = DateTime.now()
    .plus({ days: premium.accessDays })
    .toJSDate();

  const subscriber = await prisma.subscriber.create({
    data: {
      subscriptionId: premium.id,
      accessExpirationDate: expirationDate,
      renovationDate: expirationDate,
    },
  });

  await prisma.user.update({
    where: { id: viewer.id },
    data: { subscriberId: subscriber.id },
  });

  // Order + item created together to represent a completed purchase transaction.
  await prisma.order.create({
    data: {
      paymentGateway: 'stripe',
      paymentMethod: 'CREDIT_CARD',
      status: 'PAID',
      subtotal: Number(premium.price),
      total: Number(premium.price),
      clientId: subscriber.id,
      orderItems: {
        create: {
          subscriptionId: premium.id,
          subtotal: Number(premium.price),
          total: Number(premium.price),
        },
      },
    },
  });

  console.log(
    '- Subscriber: viewer subscribed to Premium, order PAID via Stripe',
  );
  return subscriber;
}
