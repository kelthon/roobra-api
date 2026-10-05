import crypto from 'node:crypto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class SimpleTokenService {
  constructor() {}

  /**
   * Generates a random hex token.
   *
   * @param size The length in hex characters, rounded up to an even number
   */
  generate(size: number = 32): string {
    // Each byte is represented by 2 hex characters
    const length = Number(size);
    const bytes = Math.ceil(length / 2);

    return crypto.randomBytes(bytes).toString('hex');
  }
}
