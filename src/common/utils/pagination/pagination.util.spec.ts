import { DefaultCursor } from '@app/types/pagination-params.type.js';
import {
  buildPageMeta,
  cursorBasedPagination,
  decodeCursor,
  encodeCursor,
  isDefaultCursor,
  offsetBasedPagination,
  parseOrderByParams,
} from './pagination.util.js';

const cursorData: DefaultCursor = {
  createdAt_id: { createdAt: '2026-01-01T00:00:00.000Z', id: 'abc123' },
};

describe('pagination.util', () => {
  describe('encodeCursor and decodeCursor', () => {
    it('should return the original data when decoding an encoded cursor', () => {
      expect(decodeCursor(encodeCursor(cursorData))).toEqual(cursorData);
    });

    it('should encode the cursor as URL-safe base64', () => {
      expect(encodeCursor(cursorData)).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('should keep only the fields of the key', () => {
      const tampered = encodeCursor({
        createdAt_id: { ...cursorData.createdAt_id, deletedAt: null },
        where: {},
      });

      expect(decodeCursor(tampered)).toEqual(cursorData);
    });

    it.each([
      ['not encoded JSON', 'not-a-cursor'],
      ['JSON of another shape', encodeCursor({ foo: 1 })],
      [
        'a cursor without an id',
        encodeCursor({ createdAt_id: { createdAt: '2026-01-01' } }),
      ],
      [
        'a cursor with an invalid date',
        encodeCursor({ createdAt_id: { createdAt: 'yesterday', id: '1' } }),
      ],
      [
        'a cursor with an empty id',
        encodeCursor({ createdAt_id: { createdAt: '2026-01-01', id: '' } }),
      ],
      [
        'a cursor with a fractional id',
        encodeCursor({ createdAt_id: { createdAt: '2026-01-01', id: 1.5 } }),
      ],
    ])('should answer invalid-cursor to %s', (_case, cursor) => {
      expect(() => decodeCursor(cursor)).toThrow(
        expect.objectContaining({ type: 'invalid-cursor' }),
      );
    });
  });

  describe('isDefaultCursor', () => {
    it('should accept a string or an integer id', () => {
      expect(isDefaultCursor(cursorData)).toBe(true);
      expect(
        isDefaultCursor({
          createdAt_id: { createdAt: '2026-01-01T00:00:00Z', id: 42 },
        }),
      ).toBe(true);
    });

    it('should reject what is not an object', () => {
      expect(isDefaultCursor(null)).toBe(false);
      expect(isDefaultCursor('cursor')).toBe(false);
      expect(isDefaultCursor({ createdAt_id: null })).toBe(false);
    });
  });

  describe('offsetBasedPagination', () => {
    it('should skip the previous pages', () => {
      expect(offsetBasedPagination(3, 20)).toEqual({ skip: 40, take: 20 });
    });

    it('should not skip on the first page', () => {
      expect(offsetBasedPagination(1, 20)).toEqual({ skip: 0, take: 20 });
    });
  });

  describe('cursorBasedPagination', () => {
    it('should decode the cursor and skip the cursor record', () => {
      expect(cursorBasedPagination(encodeCursor(cursorData), 20)).toEqual({
        cursor: cursorData,
        skip: 1,
        take: 20,
      });
    });

    it('should answer invalid-cursor to a cursor it did not make', () => {
      expect(() => cursorBasedPagination('not-a-cursor', 20)).toThrow(
        expect.objectContaining({ type: 'invalid-cursor' }),
      );
    });
  });

  describe('parseOrderByParams', () => {
    it('should map each field:order pair to a Prisma orderBy entry and break ties by id', () => {
      expect(parseOrderByParams(['createdAt:desc', 'name:asc'])).toEqual([
        { createdAt: 'desc' },
        { name: 'asc' },
        { id: 'asc' },
      ]);
    });

    it('should lowercase the order, which the validator accepts in any case', () => {
      expect(parseOrderByParams(['name:DESC'])).toEqual([
        { name: 'desc' },
        { id: 'asc' },
      ]);
    });

    it('should not add the id tie-breaker when the order already uses id', () => {
      expect(parseOrderByParams(['id:desc'])).toEqual([{ id: 'desc' }]);
    });

    it('should order by id alone when there is no pair', () => {
      expect(parseOrderByParams([])).toEqual([{ id: 'asc' }]);
    });
  });

  describe('buildPageMeta', () => {
    const query = { page: 2, limit: 10, orderBy: ['createdAt:desc'] };

    it('should count the pages and link both neighbors with the same query', () => {
      expect(buildPageMeta(query, 42)).toEqual({
        paginationType: 'page',
        page: 2,
        limit: 10,
        totalPages: 5,
        totalItems: 42,
        nextPageURI: '?page=3&limit=10&orderBy=createdAt%3Adesc',
        previousPageURI: '?page=1&limit=10&orderBy=createdAt%3Adesc',
      });
    });

    it('should have no previous page on the first page', () => {
      expect(
        buildPageMeta({ ...query, page: 1 }, 42).previousPageURI,
      ).toBeUndefined();
    });

    it('should have no next page on the last page', () => {
      expect(
        buildPageMeta({ ...query, page: 5 }, 42).nextPageURI,
      ).toBeUndefined();
    });

    it('should repeat a parameter that has several values', () => {
      expect(
        buildPageMeta({ ...query, orderBy: ['name:asc', 'createdAt:desc'] }, 42)
          .nextPageURI,
      ).toBe('?page=3&limit=10&orderBy=name%3Aasc&orderBy=createdAt%3Adesc');
    });

    it('should leave out the parameters that were not sent', () => {
      expect(
        buildPageMeta({ page: 1, limit: 10, cursor: undefined }, 42)
          .nextPageURI,
      ).toBe('?page=2&limit=10');
    });

    it('should have no pages and no links for an empty list', () => {
      expect(buildPageMeta({ ...query, page: 1 }, 0)).toMatchObject({
        totalPages: 0,
        nextPageURI: undefined,
        previousPageURI: undefined,
      });
    });
  });
});
