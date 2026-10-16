export type PageMeta = {
  paginationType: 'page';
  page: number;
  limit: number;
  totalPages: number;
  totalItems: number;
  nextPageURI?: string;
  previousPageURI?: string;
};

export type CursorMeta = {
  paginationType: 'cursor';
  cursor: string;
  nextCursor?: string;
};

export type PaginationMeta = PageMeta | CursorMeta;
