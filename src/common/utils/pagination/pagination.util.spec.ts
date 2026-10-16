import { DefaultCursor } from '@app/types/pagination-params.type.js';
import {
  cursorBasedPagination,
  decodeCursor,
  encodeCursor,
  isDefaultCursor,
  offsetBasedPagination,
  paginate,
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
      expect(offsetBasedPagination(3, 20)).toEqual({ take: 20, skip: 40 });
    });

    it.each([0, 1, -5])('should not skip when the page is %p', (page) => {
      expect(offsetBasedPagination(page, 20)).toEqual({ take: 20, skip: 0 });
    });

    it('should cap the page size at 100', () => {
      expect(offsetBasedPagination(2, 500)).toEqual({ take: 100, skip: 100 });
    });

    it('should not take a negative page size', () => {
      expect(offsetBasedPagination(2, -10)).toEqual({ take: 0, skip: 0 });
    });
  });

  describe('cursorBasedPagination', () => {
    it('should decode the cursor and skip the cursor record', () => {
      expect(cursorBasedPagination(encodeCursor(cursorData), 20)).toEqual({
        cursor: cursorData,
        take: 20,
        skip: 1,
      });
    });

    it('should cap the page size at 100', () => {
      expect(cursorBasedPagination(encodeCursor(cursorData), 500).take).toBe(
        100,
      );
    });

    it('should not take a negative page size', () => {
      expect(cursorBasedPagination(encodeCursor(cursorData), -10).take).toBe(0);
    });
  });

  describe('paginate', () => {
    it('should use the cursor when one is given', () => {
      const cursor = encodeCursor(cursorData);

      expect(paginate({ cursor, page: 3, pageSize: 20 })).toEqual({
        cursor: cursorData,
        take: 20,
        skip: 1,
      });
    });

    it('should use the page when there is no cursor', () => {
      expect(paginate({ page: 3, pageSize: 20 })).toEqual({
        take: 20,
        skip: 40,
      });
    });

    it('should start at the first page when there is no cursor or page', () => {
      expect(paginate({ pageSize: 20 })).toEqual({ take: 20, skip: 0 });
    });

    it('should use the page when the cursor is empty', () => {
      expect(paginate({ cursor: '', page: 2, pageSize: 20 })).toEqual({
        take: 20,
        skip: 20,
      });
    });
  });

  describe('parseOrderByParams', () => {
    it('should map each field:direction pair to a Prisma orderBy entry and break ties by id', () => {
      expect(parseOrderByParams(['createdAt:desc', 'name:asc'])).toEqual([
        { createdAt: 'desc' },
        { name: 'asc' },
        { id: 'asc' },
      ]);
    });

    it('should not add the id tie-breaker when the order already uses id', () => {
      expect(parseOrderByParams(['id:desc'])).toEqual([{ id: 'desc' }]);
    });

    it('should return an empty list when there is no orderBy', () => {
      expect(parseOrderByParams()).toEqual([]);
    });
  });
});
