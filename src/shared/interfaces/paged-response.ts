export interface PagedResponse<T = unknown> {
  data: T;
  meta?:
    | {
        paginationType: 'page';
        page: number;
        limit: number;
        totalPages: number;
        totalItems: number;
        nextPageURL?: string;
        previousPageURL?: string;
      }
    | {
        paginationType: 'cursor';
        cursor: string;
        hasNext: boolean;
        nextCursor?: string;
      };
}
