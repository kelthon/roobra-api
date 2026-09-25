import { BadRequestException } from '@nestjs/common';
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

    it('should throw an error when hashing an empty string', async () => {
      await expect(hashService.hash('')).rejects.toThrow(BadRequestException);
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

    it('should throw an error when verifying with an invalid argument', async () => {
      await expect(
        hashService.verify(
          'my_secret_password',
          undefined as unknown as string,
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        hashService.verify(undefined as unknown as string, 'some-hash'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
