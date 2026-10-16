import type { createPrismaClient } from '../factories/create-prisma-client.factory.js';

export type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

/** The client inside an interactive transaction (`$transaction(async (tx) => …)`) */
export type PrismaTransaction = Parameters<
  Parameters<ExtendedPrismaClient['$transaction']>[0]
>[0];
