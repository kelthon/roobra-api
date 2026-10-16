import { OrderParams } from '@app/types/order-params.type.js';
import {
  DefaultCursor,
  PaginationArgs,
  PaginationParams,
} from '@app/types/pagination-params.type.js';

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

/**
 * Maps `field:direction` pairs to a Prisma `orderBy` list. Each entry holds a
 * single field, as Prisma requires, and `id` is appended to break ties, so a
 * page never repeats or skips rows that share the sorted values.
 *
 * @param orderBy The validated `field:direction` pairs
 */
export function parseOrderByParams(orderBy?: string[]): OrderParams {
  if (!orderBy?.length) {
    return [];
  }

  const params: OrderParams = orderBy.map((param) => {
    const [field, direction] = param.split(':');
    return { [field]: direction as 'asc' | 'desc' };
  });

  return params.some((param) => 'id' in param)
    ? params
    : [...params, { id: 'asc' }];
}
