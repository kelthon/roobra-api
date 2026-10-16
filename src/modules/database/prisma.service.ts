import type { ExtendedPrismaClient } from './types/prisma.type.js';

export type { PrismaTransaction } from './types/prisma.type.js';

/**
 * The injection token of the client built by `createPrismaClient`, and its
 * type. A client extension (`$extends`) returns a new client, which a class
 * cannot extend, so the token is an abstract class and the type comes from the
 * interface merged with it: services keep injecting `PrismaService`.
 *
 * The merge is safe here, though the linter forbids it in general: the class
 * is never instantiated, the factory provides the instance, and the interface
 * only describes it. Both declarations must stay in this file, or they stop
 * merging.
 */

// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export interface PrismaService extends ExtendedPrismaClient {}
export abstract class PrismaService {}
