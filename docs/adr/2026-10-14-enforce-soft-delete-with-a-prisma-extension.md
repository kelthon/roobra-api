---
status: Draft
intended-status: Accepted
date: 2026-10-14
recorded-at: 2026-10-14
source: 'issue #10 (enforce soft delete with a Prisma client extension), branch feat/GH-10-soft-delete'
supersedes:
superseded-by:
---

# Enforce Soft Delete With A Prisma Client Extension

## Context

Eleven models have a nullable `deletedAt` column: `User`, `Key`, `StaffMember`, `Subscription`,
`Subscriber`, `Promotion`, `Media`, `MediaVolume`, `MediaChapter`, `MediaPage` and `UserReadList`.
A row is deleted by setting it, so it stays for auditing, recovery and the anonymization of deleted
accounts (issue #17). Nothing enforced it: every query had to remember `deletedAt: null`, and every
delete had to be an update. Only the user queries did. Milestone 2 adds dozens of content queries,
where one forgotten filter shows a deleted work in the catalog.

`PrismaService` extended `PrismaClient`. Prisma's client extensions (`$extends`, which replaced the
deprecated `$use` middleware) return a new client, which a class cannot extend.

## Decision

A client extension, `softDeleteExtension` (`src/modules/database/extensions/soft-delete/soft-delete.extension.ts`),
applies to the models in `SOFT_DELETE_MODELS`:

- **Queries skip deleted rows.** Reads, `count`, `aggregate`, `groupBy`, `update`, `updateMany`
  and `upsert` add `deletedAt: null` to `where`, unless `where` sets `deletedAt` itself:
  `{ deletedAt: { not: null } }` reads only deleted rows and `{ deletedAt: undefined }` every row.
- **Hard deletes are refused.** `delete` and `deleteMany` throw. `softDelete(where)` and
  `softDeleteMany(where)`, added to every model, set `deletedAt` and run through the delegate they
  are called on, so `tx.media.softDelete({ id })` stays in the caller's transaction.
- **Relations are not filtered.** A relation loaded with `include` or `select`, or a relation filter
  in `where`, needs its own `deletedAt: null`: the extension only sees the model of the query.
- **Deleting a parent does not delete its children.** Cascading soft deletes are written in the
  service, with `softDeleteMany` in the same transaction (backlog task 2.1.5).

`createPrismaClient` builds the extended client and a factory provider supplies it. `PrismaService`
becomes an abstract class used as the injection token, merged with an interface that gives it the
extended client's type, so services keep injecting `PrismaService` and tests keep replacing it with
`useValue`. `DatabaseModule` disconnects the client when the application stops, and an interactive
transaction's client is typed `PrismaTransaction`.

A unit test parses the schema and fails when a model with `deletedAt` is missing from
`SOFT_DELETE_MODELS`.

## Alternatives Considered

- **Filter by hand** — what the code did. It relies on every query remembering, which is what
  failed to scale.
- **Turn `delete` into an update inside the extension** — the usual recipe, but the query hook can
  only run the original operation, so it has to call the base client's `update`, which runs outside
  the caller's interactive transaction. Refusing `delete` and adding `softDelete` keeps
  transactions intact and makes every soft delete visible in the code.
- **Database views or row-level security** — filter in Postgres, outside the client. Not chosen:
  Prisma would need a model per view, and the rows a service may still read (auditing, restoring)
  would need a second set of models.
- **Wrap the extended client in a property (`this.prisma.client.media`)** — no declaration merging,
  but every service and every test mock would change.

## Consequences

- A query of these models cannot forget the filter, and a hard delete fails loudly.
- Reading deleted rows is explicit: a `where` that sets `deletedAt`.
- The filters written by hand before (`deletedAt: null` in the auth, sessions and users services)
  are removed: kept, they would read like the explicit `deletedAt` that asks for deleted rows. A
  query that sets `deletedAt` is now always a deliberate exception.
- Relations stay unfiltered, so a query that loads them must filter them itself.
- Removing a row for good, as the anonymization of issue #17 may need, goes through raw SQL or a
  client without the extension.
- `PrismaService` relies on declaration merging, which the linter flags; the one exception is
  documented where it is declared.
