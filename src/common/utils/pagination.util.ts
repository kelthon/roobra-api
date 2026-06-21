import { OrderParams } from 'src/shared/types/OrderParams';
import {
  DefaultCursor,
  PaginationArgs,
  PaginationParams,
} from 'src/shared/types/PaginationParams';

export function encodeCursor<T = DefaultCursor>(data: T) {
  return Buffer.from(JSON.stringify(data)).toString('base64url');
}

export function decodeCursor<T = DefaultCursor>(cursor: string): T {
  return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf-8')) as T;
}

export function offsetBasedPagination<T = DefaultCursor>(
  page: number,
  pageSize: number,
): Omit<PaginationParams<T>, 'cursor'> {
  const take = Math.min(Math.max(0, pageSize), 100);
  const skip = Math.max(page - 1, 0) * take;
  return { take, skip };
}

export function cursorBasedPagination<T = DefaultCursor>(
  cursor: string,
  pageSize: number,
): PaginationParams<T> {
  const cur = decodeCursor<T>(cursor);
  const take = Math.min(Math.max(0, pageSize), 100);
  const skip = 1;
  return { cursor: cur, take, skip };
}

export function paginate<T = DefaultCursor>(
  params: PaginationArgs,
): PaginationParams<T> {
  const { cursor, page, pageSize } = params;

  return cursor
    ? cursorBasedPagination<T>(cursor, pageSize)
    : offsetBasedPagination<T>(page ?? 0, pageSize);
}

export function parseOrderByParams(orderBy?: string[]): OrderParams {
  return (
    orderBy?.map((param) => {
      const [field, direction] = param.split(':');
      return { [field]: direction as 'asc' | 'desc' };
    }) ?? []
  );
}
