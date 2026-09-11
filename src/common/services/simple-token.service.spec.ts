import { SimpleTokenService } from './simple-token.service';

describe('SimpleTokenService', () => {
  let simpleTokenService: SimpleTokenService;

  beforeEach(() => {
    simpleTokenService = new SimpleTokenService();
  });

  describe('generate', () => {
    it('should generate a 32 char hex string by default', () => {
      const token = simpleTokenService.generate();

      expect(token).toMatch(/^[0-9a-f]{32}$/);
    });

    it('should respect an explicit size (e.g. 64, matching refreshToken.length)', () => {
      const token = simpleTokenService.generate(64);

      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should not produce the same value twice in a row', () => {
      expect(simpleTokenService.generate()).not.toBe(
        simpleTokenService.generate(),
      );
    });
  });
});
