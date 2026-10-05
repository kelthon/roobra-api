import { hash, verify } from 'argon2';
import { BadRequestException, Injectable } from '@nestjs/common';

/**
 * Argon2, for passwords only.
 *
 * @see docs/adr/2026-09-07-02-hash-secrets-by-entropy-argon2-and-sha256.md
 */
@Injectable()
export class PasswordHashService {
  /**
   * Hashes a password.
   *
   * @param raw The plain password
   * @throws BadRequestException When the password is empty
   */
  async hash(raw: string): Promise<string> {
    if (!raw) {
      throw new BadRequestException('Raw string must not be empty');
    }

    return await hash(raw);
  }

  /**
   * Checks a password against its hash.
   *
   * @param raw The plain password
   * @param hash The stored hash
   * @throws BadRequestException When the password or the hash is empty
   */
  async verify(raw: string, hash: string): Promise<boolean> {
    if (!raw || !hash) {
      throw new BadRequestException('Raw string and hash must not be empty');
    }

    return await verify(hash, raw);
  }
}
