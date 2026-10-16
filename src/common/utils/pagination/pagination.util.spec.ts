import { DefaultCursor } from '@app/types/pagination-params.type.js';
import {
  cursorBasedPagination,
  decodeCursor,
  encodeCursor,
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

    it('should throw when the cursor is not encoded JSON', () => {
      expect(() => decodeCursor('not-a-cursor')).toThrow();
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
