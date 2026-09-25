import { ConfigService } from '@nestjs/config';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from 'src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Omits credential hashes from every query unless the query asks for them, and
 * logs queries outside production.
 *
 * @see docs/adr/2026-09-04-01-global-omit-for-credential-hashes.md
 * @see docs/adr/2026-09-04-02-environment-based-prisma-query-logging.md
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
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
