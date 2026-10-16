import { Prisma } from '@app/db/prisma/client.js';

/** The part of a model delegate findManyAndCount calls */
type CountableDelegate = {
  findMany(args: unknown): Promise<unknown[]>;
  count(args: { where?: unknown }): Promise<number>;
};

/**
 * Runs `findMany` and counts every row its `where` matches, ignoring `skip`,
 * `take` and `cursor`: a page and the total of the list. The two queries run
 * through the delegate the method is called on, so the soft delete filter
 * applies to both and `tx.media.findManyAndCount()` stays in `tx`. They run
 * side by side, not in one snapshot: a row written between them can make the
 * total differ from the page by that row.
 *
 * @param args The `findMany` arguments; `where` is the only one the count reuses
 * @returns The rows and the total
 */
export async function findManyAndCount<T, A>(
  this: T,
  args: Prisma.Exact<A, Prisma.Args<T, 'findMany'>>,
): Promise<[Prisma.Result<T, A, 'findMany'>, number]> {
  const delegate = Prisma.getExtensionContext(
    this,
  ) as unknown as CountableDelegate;
  const { where } = (args ?? {}) as { where?: unknown };

  const [rows, total] = await Promise.all([
    delegate.findMany(args),
    delegate.count({ where }),
  ]);

  return [rows as Prisma.Result<T, A, 'findMany'>, total];
}

/**
 * Adds `findManyAndCount` to every model, for the page and the total of a
 * paged list.
 *
 * @see docs/adr/2026-10-16-count-paged-lists-with-a-prisma-extension.md
 */
export const findManyAndCountExtension = Prisma.defineExtension({
  name: 'findManyAndCount',
  model: {
    $allModels: { findManyAndCount },
  },
});
