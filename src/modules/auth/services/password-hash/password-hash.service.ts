import { hash, verify } from 'argon2';
import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class PasswordHashService {
  async hash(raw: string): Promise<string> {
    if (!raw) {
      throw new BadRequestException('Raw string must not be empty');
    }

    return await hash(raw);
  }

  async verify(raw: string, hash: string): Promise<boolean> {
    if (!raw || !hash) {
      throw new BadRequestException('Raw string and hash must not be empty');
    }

    return await verify(hash, raw);
  }
}
