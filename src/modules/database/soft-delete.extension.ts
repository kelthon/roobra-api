import { Prisma } from 'src/generated/prisma/client.js';

/**
 * The models with a `deletedAt` column. `soft-delete.extension.spec.ts` checks
 * this list against the schema, so a new model with the column fails the
 * tests until it is added here.
 */
export const SOFT_DELETE_MODELS: ReadonlySet<string> =
  new Set<Prisma.ModelName>([
    'User',
    'Key',
    'StaffMember',
    'Subscription',
    'Subscriber',
    'Promotion',
    'Media',
    'MediaVolume',
    'MediaChapter',
    'MediaPage',
    'UserReadList',
  ]);

/** The operations that skip deleted rows: reads, and writes that find rows */
const FILTERED_OPERATIONS: ReadonlySet<string> = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
  'update',
  'updateMany',
  'updateManyAndReturn',
  'upsert',
]);

const HARD_DELETES: ReadonlySet<string> = new Set(['delete', 'deleteMany']);

type QueryArgs = { where?: Record<string, unknown> } & Record<string, unknown>;

/**
 * Adds `deletedAt: null` to `where`, unless the query sets `deletedAt` itself:
 * `{ deletedAt: { not: null } }` reads only deleted rows, and
 * `{ deletedAt: undefined }` reads every row.
 *
 * @param args The query's arguments
 */
export function withoutDeleted<A extends QueryArgs>(args: A): A {
  if (args.where && 'deletedAt' in args.where) {
    return args;
  }

  return { ...args, where: { ...args.where, deletedAt: null } };
}

/**
 * The query hook of the extension, run before every operation of every model.
 *
 * @param params The model, the operation, its arguments and the next step
 * @param params.model The model's name
 * @param params.operation The operation's name, such as `findMany`
 * @param params.args The operation's arguments
 * @param params.query Runs the operation with the given arguments
 * @throws Error When a model with `deletedAt` is hard-deleted
 */
export function softDeleteQuery({
  model,
  operation,
  args,
  query,
}: {
  model: string;
  operation: string;
  args: unknown;
  query: (args: unknown) => Promise<unknown>;
}): Promise<unknown> {
  if (!SOFT_DELETE_MODELS.has(model)) {
    return query(args);
  }

  if (HARD_DELETES.has(operation)) {
    throw new Error(
      `${model} is soft-deleted: call softDelete or softDeleteMany instead of ${operation}`,
    );
  }

  if (FILTERED_OPERATIONS.has(operation)) {
    return query(withoutDeleted((args ?? {}) as QueryArgs));
  }

  return query(args);
}

/** The part of a model delegate the soft delete methods call */
type UpdatableDelegate = {
  $name: string;
  update(args: { where: unknown; data: object }): Promise<unknown>;
  updateMany(args: { where: unknown; data: object }): Promise<{
    count: number;
  }>;
};

/**
 * Gets the delegate the method was called on, checking that its model is
 * soft-deleted. It keeps the caller's transaction: `tx.media.softDelete()`
 * updates through `tx`.
 */
function softDeletable(that: unknown): UpdatableDelegate {
  const delegate = Prisma.getExtensionContext(
    that as object,
  ) as unknown as UpdatableDelegate;

  if (!SOFT_DELETE_MODELS.has(delegate.$name)) {
    throw new Error(`${delegate.$name} has no deletedAt column`);
  }

  return delegate;
}

/**
 * Marks one row deleted, as `tx.media.softDelete({ id })`. Throws Prisma's
 * `P2025` when no row that is not deleted matches.
 *
 * @param where The row, as for `update`
 */
export async function softDelete<T>(
  this: T,
  where: Prisma.Args<T, 'update'>['where'],
): Promise<void> {
  await softDeletable(this).update({
    where,
    data: { deletedAt: new Date() },
  });
}

/**
 * Marks every matching row deleted, as `tx.mediaPage.softDeleteMany({ … })`.
 *
 * @param where The rows, as for `updateMany`
 * @returns How many rows were marked deleted
 */
export async function softDeleteMany<T>(
  this: T,
  where: Prisma.Args<T, 'updateMany'>['where'],
): Promise<number> {
  const { count } = await softDeletable(this).updateMany({
    where,
    data: { deletedAt: new Date() },
  });

  return count;
}

/**
 * Marks rows deleted instead of deleting them, and makes every query of these
 * models skip deleted rows.
 *
 * - Reads, `count`, `aggregate`, `groupBy`, `update`, `updateMany` and
 *   `upsert` add `deletedAt: null` to `where`, unless `where` sets `deletedAt`.
 * - `delete` and `deleteMany` throw: `softDelete` and `softDeleteMany` set
 *   `deletedAt` instead.
 * - Relations loaded with `include` or `select`, and relation filters in
 *   `where`, are not filtered: they need their own `deletedAt: null`.
 *
 * @see docs/adr/2026-10-14-enforce-soft-delete-with-a-prisma-extension.md
 */
export const softDeleteExtension = Prisma.defineExtension({
  name: 'softDelete',
  query: {
    $allModels: {
      $allOperations: softDeleteQuery,
    },
  },
  model: {
    $allModels: { softDelete, softDeleteMany },
  },
});
