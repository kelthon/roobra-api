export type DefaultCursor = {
  createdAt_id: {
    createdAt: string | Date;
    id: string | number;
  };
};

export type PaginationArgs = {
  cursor?: string;
  page?: number;
  pageSize: number;
};

export type PaginationParams<T = DefaultCursor> = {
  cursor?: T;
  take?: number;
  skip?: number;
};
