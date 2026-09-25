import type {
  PrismaClient,
  Media,
  MediaPage,
} from '../../src/generated/prisma/client.js';

// A fixed slug ensures the media can be found on re-runs without creating duplicates.
const MEDIA_SLUG = 'future-samurai-seed';

interface ContentSeeds {
  media: Media;
  pages: MediaPage[];
}

export async function seedContent(prisma: PrismaClient): Promise<ContentSeeds> {
  const [actionGenre] = await Promise.all([
    prisma.mediaGenre.upsert({
      where: { slug: 'action' },
      create: { name: 'Action', slug: 'action' },
      update: { name: 'Action' },
    }),
    prisma.mediaGenre.upsert({
      where: { slug: 'fantasy' },
      create: { name: 'Fantasy', slug: 'fantasy' },
      update: { name: 'Fantasy' },
    }),
  ]);

  const media = await prisma.media.upsert({
    where: { slug: MEDIA_SLUG },
    create: {
      name: 'Future Samurai',
      slug: MEDIA_SLUG,
      description:
        'A samurai awakens 500 years in the future and must adapt to a cyberpunk world.',
      authors: ['Seed Author'],
      genres: { connect: { id: actionGenre.id } },
    },
    update: {
      name: 'Future Samurai',
      authors: ['Seed Author'],
      genres: { set: [{ id: actionGenre.id }] },
    },
  });

  const volume = await prisma.mediaVolume.upsert({
    where: { mediaId_number: { mediaId: media.id, number: 1 } },
    create: { mediaId: media.id, number: 1, title: 'Volume 1', authors: [] },
    update: { title: 'Volume 1' },
  });

  const chapter = await prisma.mediaChapter.upsert({
    where: { volumeId_number: { volumeId: volume.id, number: 1 } },
    create: {
      volumeId: volume.id,
      number: 1,
      title: 'Chapter 1 — The Awakening',
    },
    update: { title: 'Chapter 1 — The Awakening' },
  });

  const pages = await Promise.all(
    [1, 2, 3].map((num) =>
      prisma.mediaPage.upsert({
        where: { chapterId_number: { chapterId: chapter.id, number: num } },
        create: {
          chapterId: chapter.id,
          number: num,
          imageUrl: `https://placehold.co/800x1200?text=Page+${num}`,
        },
        update: { imageUrl: `https://placehold.co/800x1200?text=Page+${num}` },
      }),
    ),
  );

  console.log('- Content: 2 genres, 1 media → 1 volume → 1 chapter → 3 pages');
  return { media, pages };
}
