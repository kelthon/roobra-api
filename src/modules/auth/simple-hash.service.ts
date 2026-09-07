import { Injectable } from '@nestjs/common';
import crypto from 'node:crypto';

@Injectable()
export class SimpleHashService {
  private readonly algorithm: string = 'sha256';

  constructor() {}

  public hash(raw: string): string {
    return crypto.createHash(this.algorithm).update(raw).digest('hex');
  }

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
