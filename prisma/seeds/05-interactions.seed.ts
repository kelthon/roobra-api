import type {
  PrismaClient,
  Media,
  MediaPage,
  Subscriber,
} from '../../src/generated/prisma/client';

export async function seedInteractions(
  prisma: PrismaClient,
  subscriber: Subscriber,
  media: Media,
  pages: MediaPage[],
): Promise<void> {
  const existingReadList = await prisma.userReadList.findFirst({
    where: { clientId: subscriber.id, mediaId: media.id, deletedAt: null },
  });

  if (!existingReadList) {
    await prisma.userReadList.create({
      data: { clientId: subscriber.id, mediaId: media.id },
    });
  }

  // Pages 0 and 1 are marked COMPLETED to simulate reading progress;
  // page 2 stays IN_PROGRESS to represent the reader's current position.
  const historyEntries = [
    { page: pages[0], status: 'COMPLETED' as const },
    { page: pages[1], status: 'COMPLETED' as const },
    { page: pages[2], status: 'IN_PROGRESS' as const },
  ];

  for (const { page, status } of historyEntries) {
    const exists = await prisma.userHistory.findFirst({
      where: { clientId: subscriber.id, pageId: page.id },
    });

    if (!exists) {
      await prisma.userHistory.create({
        data: { clientId: subscriber.id, pageId: page.id, status },
      });
    }
  }

  console.log(
    '- Interactions: 1 read list entry, 3 history entries (2 COMPLETED, 1 IN_PROGRESS)',
  );
}
