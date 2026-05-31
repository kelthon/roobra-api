import { HashService } from './hash.service';

describe('HashService', () => {
  let hashService: HashService;

  beforeAll(() => {
    // Initialize the HashService instance before all tests
    hashService = new HashService();
  });

  describe('hash', () => {
    it('should return a hashed string that is different from the raw input', async () => {
      const raw = 'my_secret_password';
      const hashed = await hashService.hash(raw);
      expect(hashed).not.toBe(raw);
    });

    it('should throw an error when hashing an empty string', async () => {
      await expect(hashService.hash('')).rejects.toThrow();
    });
  });

  it('should throw an error when verifying with an invalid hash', async () => {
    await expect(
      hashService.verify('my_secret_password', 'invalid_hash'),
    ).rejects.toThrow();
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
  });
});
