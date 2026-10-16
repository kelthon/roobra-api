import { findManyAndCount } from './find-many-and-count.extension.js';

/** A model delegate whose queries resolve to the given rows and total */
function delegateOf(rows: unknown[], total: number) {
  return {
    $name: 'Media',
    findMany: vi.fn().mockResolvedValue(rows),
    count: vi.fn().mockResolvedValue(total),
  };
}

/** Calls the extension method the way Prisma does: on a model delegate */
function run(delegate: ReturnType<typeof delegateOf>, args: unknown) {
  return (
    findManyAndCount as (this: unknown, args: unknown) => Promise<unknown>
  ).call(delegate, args);
}

describe('findManyAndCount', () => {
  it('should return the rows and the total', async () => {
    const delegate = delegateOf([{ id: 1n }], 42);

    await expect(run(delegate, { take: 1 })).resolves.toEqual([
      [{ id: 1n }],
      42,
    ]);
  });

  it('should pass every argument to findMany', async () => {
    const delegate = delegateOf([], 0);
    const args = {
      where: { name: 'Example' },
      select: { id: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: 10,
      take: 10,
      distinct: ['name'],
      omit: { description: true },
    };

    await run(delegate, args);

    expect(delegate.findMany).toHaveBeenCalledWith(args);
  });

  it('should count with the where alone', async () => {
    const delegate = delegateOf([], 0);

    await run(delegate, {
      where: { name: 'Example' },
      select: { id: true },
      orderBy: [{ id: 'asc' }],
      cursor: { id: 5n },
      skip: 1,
      take: 10,
      omit: { description: true },
    });

    expect(delegate.count).toHaveBeenCalledWith({ where: { name: 'Example' } });
  });

  it('should count every row when there is no where', async () => {
    const delegate = delegateOf([], 0);

    await run(delegate, undefined);

    expect(delegate.count).toHaveBeenCalledWith({ where: undefined });
  });

  it('should run both queries without a $transaction, so it works inside one', async () => {
    const delegate = {
      ...delegateOf([], 0),
      $transaction: vi.fn(),
    };

    await run(delegate, {});

    expect(delegate.$transaction).not.toHaveBeenCalled();
  });
});
