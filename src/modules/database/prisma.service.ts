import { ConfigService } from '@nestjs/config';
import { Provider } from '@nestjs/common';
import { PrismaClient } from 'src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Builds the client every service uses: it omits credential hashes from every
 * query unless the query asks for them, and logs queries outside production.
 *
 * @param config The application config, for `database.url` and `app.mode`
 * @see docs/adr/2026-09-04-01-global-omit-for-credential-hashes.md
 * @see docs/adr/2026-09-04-02-environment-based-prisma-query-logging.md
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
  });
}

export type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

/** The client inside an interactive transaction (`$transaction(async (tx) => …)`) */
export type PrismaTransaction = Parameters<
  Parameters<ExtendedPrismaClient['$transaction']>[0]
>[0];

/**
 * The injection token of the client built by `createPrismaClient`, and its
 * type. A client extension (`$extends`) returns a new client, which a class
 * cannot extend, so the token is an abstract class and the type comes from the
 * interface merged with it: services keep injecting `PrismaService`.
 */
// oxlint-disable-next-line typescript/no-unsafe-declaration-merging -- the class is only an injection token: the factory provides the instance, and the interface describes it
export interface PrismaService extends ExtendedPrismaClient {}
export abstract class PrismaService {}

export const prismaServiceProvider: Provider = {
  provide: PrismaService,
  inject: [ConfigService],
  useFactory: createPrismaClient,
};
