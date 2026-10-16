import { DateTime } from 'luxon';
import { ProblemException } from '@app/common/exceptions/problem.exception.js';
import { isRecord } from '@app/common/utils/type-guard/type-guard.util.js';
import { OrderParams } from '@app/types/order-params.type.js';
import {
  DefaultCursor,
  PaginationArgs,
  PaginationParams,
} from '@app/types/pagination-params.type.js';

/**
 * Checks that a decoded cursor points at a row: a `createdAt_id` with an ISO
 * date and an id, a non-empty string or an integer. It comes from JSON, so
 * the date is always a string.
 *
 * @param cursor The parsed JSON of a cursor
 */
export function isDefaultCursor(cursor: unknown): cursor is DefaultCursor {
  if (!isRecord(cursor) || !isRecord(cursor.createdAt_id)) {
    return false;
  }

  const { createdAt, id } = cursor.createdAt_id;

  return (
    typeof createdAt === 'string' &&
    DateTime.fromISO(createdAt).isValid &&
    ((typeof id === 'string' && id.length > 0) || Number.isSafeInteger(id))
  );
}

export function encodeCursor<T = DefaultCursor>(data: T): string {
  return Buffer.from(JSON.stringify(data)).toString('base64url');
}

/**
 * Reads a cursor sent by a client. Only the fields of the key are kept, so a
 * field added by hand never reaches Prisma.
 *
 * @param cursor The opaque cursor from the query string
 * @throws ProblemException `invalid-cursor` when it is not one this API made
 */
export function decodeCursor(cursor: string): DefaultCursor {
  let value: unknown;

  try {
    value = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf-8'));
  } catch {
    throw new ProblemException('invalid-cursor');
  }

  if (!isDefaultCursor(value)) {
    throw new ProblemException('invalid-cursor');
  }

  const { createdAt, id } = value.createdAt_id;
  return { createdAt_id: { createdAt, id } };
}

export function offsetBasedPagination(
  page: number,
  pageSize: number,
): Omit<PaginationParams, 'cursor'> {
  const take = Math.min(Math.max(0, pageSize), 100);
  const skip = Math.max(page - 1, 0) * take;
  return { take, skip };
}

export function cursorBasedPagination(
  cursor: string,
  pageSize: number,
): PaginationParams {
  const cur = decodeCursor(cursor);
  const take = Math.min(Math.max(0, pageSize), 100);
  const skip = 1;
  return { cursor: cur, take, skip };
}

export function paginate(params: PaginationArgs): PaginationParams {
  const { cursor, page, pageSize } = params;

  return cursor
    ? cursorBasedPagination(cursor, pageSize)
    : offsetBasedPagination(page ?? 0, pageSize);
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
