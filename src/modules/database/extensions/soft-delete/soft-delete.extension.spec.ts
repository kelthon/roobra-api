import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  SOFT_DELETE_MODELS,
  softDelete,
  softDeleteMany,
  softDeleteQuery,
  withoutDeleted,
} from './soft-delete.extension.js';

/** The models of the Prisma schema that have a `deletedAt` field */
function modelsWithDeletedAt(): string[] {
  const dir = join(
    import.meta.dirname,
    '..',
    '..',
    '..',
    '..',
    '..',
    'prisma',
    'models',
  );

  return readdirSync(dir)
    .filter((file) => file.endsWith('.prisma'))
    .flatMap((file) =>
      [
        ...readFileSync(join(dir, file), 'utf-8').matchAll(
          /model (\w+) \{([^}]*)\}/g,
        ),
      ]
        .filter(([, , body]) => /^\s*deletedAt\s/m.test(body))
        .map(([, name]) => name),
    );
}

/** Runs the query hook and returns the arguments it ran the operation with */
async function runQuery(model: string, operation: string, args: unknown) {
  const query = vi.fn().mockResolvedValue('result');

  await softDeleteQuery({ model, operation, args, query });

  return query.mock.calls[0][0] as unknown;
}

describe('SOFT_DELETE_MODELS', () => {
  it('should list every model of the schema that has a deletedAt column', () => {
    expect([...SOFT_DELETE_MODELS].sort()).toEqual(
      modelsWithDeletedAt().sort(),
    );
  });
});

describe('withoutDeleted', () => {
  it('should add deletedAt: null to where', () => {
    expect(withoutDeleted({ where: { id: 1n } })).toEqual({
      where: { id: 1n, deletedAt: null },
    });
  });

  it('should add a where to a query without one', () => {
    expect(withoutDeleted({ take: 10 })).toEqual({
      take: 10,
      where: { deletedAt: null },
    });
  });

  it.each([
    ['only deleted rows', { not: null }],
    ['every row', undefined],
  ])('should keep a where that asks for %s', (_case, deletedAt) => {
    const args = { where: { id: 1n, deletedAt } };

    expect(withoutDeleted(args)).toBe(args);
  });
});

describe('softDeleteQuery', () => {
  it.each([
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
  ])('should skip deleted rows in %s', async (operation) => {
    await expect(
      runQuery('Media', operation, { where: { id: 1n } }),
    ).resolves.toEqual({ where: { id: 1n, deletedAt: null } });
  });

  it('should skip deleted rows when findMany has no arguments', async () => {
    await expect(runQuery('Media', 'findMany', undefined)).resolves.toEqual({
      where: { deletedAt: null },
    });
  });

  it.each(['create', 'createMany', 'createManyAndReturn'])(
    'should not change %s',
    async (operation) => {
      const args = { data: { title: 'A title' } };

      await expect(runQuery('Media', operation, args)).resolves.toBe(args);
    },
  );

  it('should not change a model without deletedAt', async () => {
    const args = { where: { id: 1n } };

    await expect(runQuery('RefreshToken', 'findMany', args)).resolves.toBe(
      args,
    );
  });

  it('should let a model without deletedAt be deleted', async () => {
    const args = { where: { id: 1n } };

    await expect(runQuery('RefreshToken', 'delete', args)).resolves.toBe(args);
  });

  it.each(['delete', 'deleteMany'])(
    'should refuse to %s a soft-deleted model',
    (operation) => {
      const query = vi.fn();

      expect(() =>
        softDeleteQuery({
          model: 'Media',
          operation,
          args: { where: { id: 1n } },
          query,
        }),
      ).toThrow('Media is soft-deleted: call softDelete or softDeleteMany');
      expect(query).not.toHaveBeenCalled();
    },
  );
});

describe('softDelete', () => {
  it('should set deletedAt on the row, through the delegate it was called on', async () => {
    const delegate = { $name: 'Media', update: vi.fn() };

    await softDelete.call(delegate, { id: 1n });

    expect(delegate.update).toHaveBeenCalledWith({
      where: { id: 1n },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it('should refuse a model without deletedAt', async () => {
    const delegate = { $name: 'RefreshToken', update: vi.fn() };

    await expect(softDelete.call(delegate, { id: 1n })).rejects.toThrow(
      'RefreshToken has no deletedAt column',
    );
    expect(delegate.update).not.toHaveBeenCalled();
  });
});

describe('softDeleteMany', () => {
  it('should set deletedAt on every matching row and return the count', async () => {
    const delegate = {
      $name: 'MediaPage',
      updateMany: vi.fn().mockResolvedValue({ count: 3 }),
    };

    await expect(
      softDeleteMany.call(delegate, { chapterId: 1n }),
    ).resolves.toBe(3);
    expect(delegate.updateMany).toHaveBeenCalledWith({
      where: { chapterId: 1n },
      data: { deletedAt: expect.any(Date) },
    });
  });
});
