import { SimpleHashService } from './simple-hash.service';

describe('SimpleHashService', () => {
  let simpleHashService: SimpleHashService;

  beforeEach(() => {
    simpleHashService = new SimpleHashService();
  });

  describe('hash', () => {
    it('should be deterministic for the same input', () => {
      const raw = 'some-opaque-token';

      expect(simpleHashService.hash(raw)).toBe(simpleHashService.hash(raw));
    });

    it('should produce a 64 char hex digest (sha256)', () => {
      const result = simpleHashService.hash('some-opaque-token');

      expect(result).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should produce different digests for different inputs', () => {
      expect(simpleHashService.hash('token-a')).not.toBe(
        simpleHashService.hash('token-b'),
      );
    });
  });

  describe('verify', () => {
    it('should return true for a matching raw/hash pair', () => {
      const raw = 'some-opaque-token';
      const hash = simpleHashService.hash(raw);

      expect(simpleHashService.verify(raw, hash)).toBe(true);
    });

    it('should return false for a wrong raw value, without throwing', () => {
      const hash = simpleHashService.hash('some-opaque-token');

      expect(simpleHashService.verify('another-token', hash)).toBe(false);
    });

    it('should return false without throwing when the hash has a different length', () => {
      expect(() =>
        simpleHashService.verify('some-opaque-token', 'too-short'),
      ).not.toThrow();

      expect(simpleHashService.verify('some-opaque-token', 'too-short')).toBe(
        false,
      );
    });
  });
});
