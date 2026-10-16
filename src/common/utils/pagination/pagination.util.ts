import { DateTime } from 'luxon';
import { ProblemException } from '@app/common/exceptions/problem.exception.js';
import { isRecord } from '@app/common/utils/type-guard/type-guard.util.js';
import { FieldsSortOrder } from '@app/types/fields-sort-order.type.js';
import { PageMeta } from '@app/types/pagination-meta.type.js';
import {
  CursorWindow,
  DefaultCursor,
  PageWindow,
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

/**
 * Turns a page into Prisma's `skip` and `take`. The query DTO validates both
 * and gives their defaults, so they are used as they are.
 *
 * @param page The page number, starting at 1
 * @param limit How many rows a page holds
 */
export function offsetBasedPagination(page: number, limit: number): PageWindow {
  return { skip: (page - 1) * limit, take: limit };
}

/**
 * Turns a cursor into Prisma's `cursor`, `skip` and `take`. `skip: 1` leaves
 * out the row the cursor points at, which ended the previous page. The id of
 * the cursor is a string or a number: the caller converts it to the type of
 * its model's id.
 *
 * @param cursor The opaque cursor from the query string
 * @param limit How many rows a page holds
 * @throws ProblemException `invalid-cursor` when it is not one this API made
 */
export function cursorBasedPagination(
  cursor: string,
  limit: number,
): CursorWindow {
  return { cursor: decodeCursor(cursor), skip: 1, take: limit };
}

/**
 * Maps `field:order` pairs to a Prisma `orderBy` list. Each entry holds a
 * single field, as Prisma requires, and `id` is appended to break ties, so a
 * page never repeats or skips rows that share the sorted values. The pairs
 * come validated by `@IsOrderByField()`.
 *
 * @param orderBy The `field:asc` or `field:desc` pairs
 */
export function parseOrderByParams(orderBy: string[]): FieldsSortOrder {
  const params: FieldsSortOrder = orderBy.map((param) => {
    const [field, order] = param.split(':');
    return { [field]: order.toLowerCase() as 'asc' | 'desc' };
  });

  return params.some((param) => 'id' in param)
    ? params
    : [...params, { id: 'asc' }];
}

/**
 * Builds the `meta` of a list paged by page. The links to the neighboring
 * pages are query strings that keep every other parameter of the query, such
 * as `limit`, `orderBy` and the filters.
 *
 * @param query The validated query of the list
 * @param query.page The page sent
 * @param query.limit The page size sent
 * @param totalItems How many rows the whole list has
 */
export function buildPageMeta<Q extends { page: number; limit: number }>(
  query: Q,
  totalItems: number,
): PageMeta {
  const { page, limit } = query;
  const totalPages = Math.ceil(totalItems / limit);

  return {
    paginationType: 'page',
    page,
    limit,
    totalPages,
    totalItems,
    nextPageURI: page < totalPages ? pageURI(query, page + 1) : undefined,
    previousPageURI: page > 1 ? pageURI(query, page - 1) : undefined,
  };
}

/** The query string of another page of the same query */
function pageURI(query: object, page: number): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries({ ...query, page })) {
    for (const item of [value].flat()) {
      if (item !== undefined && item !== null) {
        search.append(key, String(item));
      }
    }
  }

  return `?${search.toString()}`;
}
