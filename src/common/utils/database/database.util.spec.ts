import {
  isPrismaClientError,
  isProvidedValueTooLongError,
  isRecordNotFoundError,
  isUniqueConstraintViolationError,
} from './database.util.js';

describe('database.util', () => {
  describe('isPrismaClientError', () => {
    it('should match an object with the given code', () => {
      expect(isPrismaClientError({ code: 'P2025' }, 'P2025')).toBe(true);
    });

    it('should not match a different code', () => {
      expect(isPrismaClientError({ code: 'P2002' }, 'P2025')).toBe(false);
    });

    it.each([undefined, null, 'P2025', 42, new Error('boom')])(
      'should not match %p',
      (value) => {
        expect(isPrismaClientError(value, 'P2025')).toBe(false);
      },
    );
  });

  describe('named guards', () => {
    it('should recognise the record not found error', () => {
      expect(isRecordNotFoundError({ code: 'P2025' })).toBe(true);
      expect(isRecordNotFoundError({ code: 'P2002' })).toBe(false);
    });

    it('should recognise the value too long error', () => {
      expect(isProvidedValueTooLongError({ code: 'P2000' })).toBe(true);
    });

    it('should expose the violated columns of a unique constraint error', () => {
      const error: unknown = { code: 'P2002', meta: { target: ['email'] } };

      if (!isUniqueConstraintViolationError(error)) {
        throw new Error('expected a unique constraint violation');
      }

      expect(error.meta?.target?.includes('email')).toBe(true);
    });
  });
});
