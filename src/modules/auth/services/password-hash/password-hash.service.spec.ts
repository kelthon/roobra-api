import { HttpException } from '@nestjs/common';
import { PasswordHashService } from './password-hash.service.js';

describe('HashService', () => {
  let hashService: PasswordHashService;

  beforeAll(() => {
    // Initialize the HashService instance before all tests
    hashService = new PasswordHashService();
  });

  describe('hash', () => {
    it('should return a hashed string that is different from the raw input', async () => {
      const raw = 'my_secret_password';
      const hashed = await hashService.hash(raw);
      expect(hashed).not.toBe(raw);
    });

    it('should throw a plain error, not an HTTP one, when hashing an empty string', async () => {
      const error: unknown = await hashService.hash('').catch((e) => e);

      expect(error).toBeInstanceOf(Error);
      expect(error).not.toBeInstanceOf(HttpException);
      expect((error as Error).message).toBe('Raw string must not be empty');
    });
  });

  describe('verify', () => {
    it('should return a valid hash that can be verified', async () => {
      const raw = 'my_secret_password';
      const hashed = await hashService.hash(raw);
      const isValid = await hashService.verify(raw, hashed);
      expect(isValid).toBe(true);
    });

    it('should return false when verifying with an incorrect raw string', async () => {
      const raw = 'my_secret_password';
      const hashed = await hashService.hash(raw);
      const isValid = await hashService.verify('wrong_password', hashed);
      expect(isValid).toBe(false);
    });

    it.each([
      ['an empty hash', 'my_secret_password', undefined],
      ['an empty password', undefined, 'some-hash'],
    ])(
      'should throw a plain error, not an HTTP one, when verifying %s',
      async (_case, raw, hash) => {
        const error: unknown = await hashService
          .verify(raw as unknown as string, hash as unknown as string)
          .catch((e) => e);

        expect(error).toBeInstanceOf(Error);
        expect(error).not.toBeInstanceOf(HttpException);
        expect((error as Error).message).toBe(
          'Raw string and hash must not be empty',
        );
      },
    );
  });
});
