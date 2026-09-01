import type {
  User,
  PrismaClient,
  Subscriber,
  Subscription,
} from '../../src/generated/prisma/client';
import { PaymentMethod, GatewayStatus } from 'src/generated/prisma/enums';
import { DateTime } from 'luxon';

export async function seedSubscribers(
  prisma: PrismaClient,
  user: User,
  premium: Subscription,
): Promise<Subscriber> {
  // Fetch the current subscriber state in case a previous run already set subscriberId.
  const freshSubscriber = await prisma.subscriber.findFirst({
    where: { userId: user.id },
  });

  if (freshSubscriber) {
    console.log('- Subscriber: already exists, skipping');
    return freshSubscriber;
  }

  const expirationDate = DateTime.now()
    .plus({ days: premium.accessDays })
    .toJSDate();

  const subscriber = await prisma.subscriber.create({
    data: {
      subscriptionId: premium.id,
      accessExpirationDate: expirationDate,
      renovationDate: expirationDate,
      userId: user.id,
    },
  });

  // Order + item created together to represent a completed purchase transaction.
  await prisma.order.create({
    data: {
      paymentGateway: 'stripe',
      paymentMethod: PaymentMethod.CREDIT_CARD,
      status: GatewayStatus.PAID,
      subtotal: Number(premium.price),
      total: Number(premium.price),
      subscriberId: subscriber.id,
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
    '- Subscriber: subscriber user subscribed to Premium, order PAID via Stripe',
  );
  return subscriber;
}
