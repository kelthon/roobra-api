import type {
  PrismaClient,
  Media,
  MediaPage,
  Subscriber,
} from '../../src/generated/prisma/client.js';
import { ReadingProgressStatus } from '../../src/generated/prisma/client.js';

export async function seedInteractions(
  prisma: PrismaClient,
  subscriber: Subscriber,
  media: Media,
  pages: MediaPage[],
): Promise<void> {
  const existingReadList = await prisma.userReadList.findFirst({
    where: { subscriberId: subscriber.id, mediaId: media.id, deletedAt: null },
  });

  if (!existingReadList) {
    await prisma.userReadList.create({
      data: { subscriberId: subscriber.id, mediaId: media.id },
    });
  }

  // Pages 0 and 1 are marked COMPLETED to simulate reading progress;
  // page 2 stays IN_PROGRESS to represent the reader's current position.
  const historyEntries = [
    { page: pages[0], status: ReadingProgressStatus.COMPLETED },
    { page: pages[1], status: ReadingProgressStatus.COMPLETED },
    { page: pages[2], status: ReadingProgressStatus.IN_PROGRESS },
  ];

  for (const { page, status } of historyEntries) {
    const exists = await prisma.userHistory.findFirst({
      where: { subscriberId: subscriber.id, pageId: page.id },
    });

    if (!exists) {
      await prisma.userHistory.create({
        data: { subscriberId: subscriber.id, pageId: page.id, status },
      });
    }
  }

  console.log(
    '- Interactions: 1 read list entry, 3 history entries (2 COMPLETED, 1 IN_PROGRESS)',
  );
}
