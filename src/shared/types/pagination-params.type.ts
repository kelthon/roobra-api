export type DefaultCursor = {
  createdAt_id: {
    createdAt: string | Date;
    id: string | number;
  };
};

/** Prisma's arguments for one page of a list paged by page */
export type PageWindow = {
  skip: number;
  take: number;
};

/** Prisma's arguments for one page of a list paged by cursor */
export type CursorWindow = PageWindow & {
  cursor: DefaultCursor;
};
