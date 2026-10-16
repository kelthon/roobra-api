import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@app/db/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { softDeleteExtension } from '../extensions/soft-delete/soft-delete.extension.js';
import { findManyAndCountExtension } from '../extensions/find-many-and-count/find-many-and-count.extension.js';

/**
 * Builds the client every service uses: it omits credential hashes from every
 * query unless the query asks for them, logs queries outside production,
 * soft-deletes the models with a `deletedAt` column, and adds
 * `findManyAndCount` to every model for paged lists.
 *
 * @param config The application config, for `database.url` and `app.mode`
 * @see docs/adr/2026-09-04-01-global-omit-for-credential-hashes.md
 * @see docs/adr/2026-09-04-02-environment-based-prisma-query-logging.md
 * @see docs/adr/2026-10-14-enforce-soft-delete-with-a-prisma-extension.md
 * @see docs/adr/2026-10-16-count-paged-lists-with-a-prisma-extension.md
 */
export function createPrismaClient(config: ConfigService) {
  const connectionString = `${config.get<string>('database.url')}`;
  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({
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
  })
    .$extends(softDeleteExtension)
    .$extends(findManyAndCountExtension);
}
