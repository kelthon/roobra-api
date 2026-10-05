import { Injectable } from '@nestjs/common';
import crypto from 'node:crypto';

/**
 * SHA-256, for high-entropy random tokens only; passwords go through
 * `PasswordHashService`.
 *
 * @see docs/adr/2026-09-07-02-hash-secrets-by-entropy-argon2-and-sha256.md
 */
@Injectable()
export class SimpleHashService {
  private readonly algorithm: string = 'sha256';

  constructor() {}

  public hash(raw: string): string {
    return crypto.createHash(this.algorithm).update(raw).digest('hex');
  }

  /**
   * Checks a token against its hash in constant time.
   *
   * @param raw The raw token
   * @param hash The stored hash
   */
  public verify(raw: string, hash: string): boolean {
    const expectedHash = this.hash(raw);

    if (expectedHash.length !== hash.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(hash, 'hex'),
      Buffer.from(expectedHash, 'hex'),
    );
  }
}
