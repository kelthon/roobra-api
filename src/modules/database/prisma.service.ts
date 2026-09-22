import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { PrismaClient } from 'src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor(config: ConfigService) {
    const connectionString = `${config.get<string>('database.url')}`;
    const adapter = new PrismaPg({ connectionString });
    super({
      adapter,
      log:
        config.get('app.mode') === 'production'
          ? [
              { level: 'warn', emit: 'stdout' },
              { level: 'error', emit: 'stdout' },
            ]
          : [
              { level: 'query', emit: 'stdout' },
              { level: 'warn', emit: 'stdout' },
              { level: 'error', emit: 'stdout' },
            ],

      omit: {
        user: { hashedPassword: true },
        refreshToken: { hashedToken: true },
        passwordResetToken: { hashedToken: true },
        emailVerificationToken: { hashedToken: true },
        key: { hashedKey: true },
      },
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
