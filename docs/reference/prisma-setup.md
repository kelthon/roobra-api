# Prisma Setup Reference

**Location:** `prisma/`, `prisma.config.ts` and `src/modules/database/` — verified against branch
`docs/restructure-documentation`, 2026-09-18.

## Schema Layout

`prisma.config.ts` points Prisma at the folder `prisma/models` (`schema: 'prisma/models'`). Migrations
are in `prisma/migrations`, and the seed runs with `tsx prisma/seed.ts`.

| File | Contents |
| --- | --- |
| `schema.prisma` | `generator client` (`prisma-client`, output `src/generated/prisma`, `cjs`) and the `postgresql` datasource |
| `auth.prisma` | User, RefreshToken, PasswordResetToken, EmailVerificationToken, Key, StaffMember |
| `content.prisma` | Media, MediaVolume, MediaChapter, MediaPage, MediaGenre, UserHistory, UserReadList |
| `commerce.prisma` | Subscription, Subscriber, Promotion, PromotionUsage, Order, OrderItem, OrderRefund |
| `audit.prisma` | AuditLog |

Why: [domain-based schema files](../adr/2026-09-10-domain-based-prisma-schema-files.md). The
generated client is gitignored and produced by `npx prisma generate`, see
[the Docker ADR](../adr/2026-08-28-01-prisma-cli-as-dependency-and-generate-in-docker.md).

## Identifier Types

| Type | Models |
| --- | --- |
| `String` nanoid, `Char(21)` | `User` |
| `Int` autoincrement | `Key`, `StaffMember`, `MediaGenre` |
| `BigInt` autoincrement | every other model |

`JSON.stringify` refuses a `bigint`, so `configureApp` calls `serializeBigIntAsString`
(`src/common/utils/serialization/bigint-json.ts`), which writes every `BigInt` as a string: a client
receives `"id": "42"`, like the nano id of `User`
([ADR](https://github.com/kelthon/roobra-docs/blob/main/adr/2026-10-14-send-bigint-ids-as-strings.md)).
A route that takes such an id from the path or the query receives a string and converts it with
`BigInt()`.

## Soft Delete

Eleven models have a nullable `deletedAt`: `User`, `Key`, `StaffMember`, `Subscription`,
`Subscriber`, `Promotion`, `Media`, `MediaVolume`, `MediaChapter`, `MediaPage`, `UserReadList`.
`softDeleteExtension` (`src/modules/database/soft-delete.extension.ts`) enforces it for every query
of these models ([ADR](../adr/2026-10-14-enforce-soft-delete-with-a-prisma-extension.md)):

| Operation | Behavior |
| --- | --- |
| `findUnique`, `findFirst`, `findMany` (and their `OrThrow`), `count`, `aggregate`, `groupBy` | Skip deleted rows: `deletedAt: null` is added to `where` |
| `update`, `updateMany`, `updateManyAndReturn`, `upsert` | Same: a deleted row is not found (`P2025` for `update`) |
| `delete`, `deleteMany` | Throw: use `softDelete` |
| `softDelete(where)`, `softDeleteMany(where)` | Set `deletedAt` on the matching rows that are not deleted, through the delegate they are called on, so `tx.media.softDelete({ id })` stays in `tx`. `softDeleteMany` returns the count |
| `create`, `createMany` | Unchanged |

- A `where` that sets `deletedAt` is left as it is: `{ deletedAt: { not: null } }` reads only
  deleted rows, `{ deletedAt: undefined }` every row.
- Relations loaded with `include` or `select`, and relation filters in `where`, are **not**
  filtered: add `deletedAt: null` to them.
- Deleting a parent does not delete its children: the service soft-deletes them in the same
  transaction.
- A model that gains a `deletedAt` column must be added to `SOFT_DELETE_MODELS`;
  `soft-delete.extension.spec.ts` fails until it is.

## Client Configuration

`createPrismaClient` (`src/modules/database/prisma.service.ts`) is the single place the client is
built: a `PrismaClient` with the options below, extended with `softDeleteExtension`. `DatabaseModule`
provides it under the `PrismaService` token, an abstract class merged with an interface that gives
it the extended client's type, so services inject `PrismaService` and tests replace it with
`useValue`. The client inside an interactive transaction is typed `PrismaTransaction`.

| Option | Value | Decision |
| --- | --- | --- |
| `adapter` | `PrismaPg` with `connectionString` from `database.url`; no pool options, so `pg` defaults apply | — |
| `omit` | `hashedPassword`, `hashedToken` (refresh and password reset), `hashedKey` | [Global omit](../adr/2026-09-04-01-global-omit-for-credential-hashes.md) |
| `log` | `warn`, `error` in production; adds `query` otherwise | [Query logging](../adr/2026-09-04-02-environment-based-prisma-query-logging.md) |

`DatabaseModule.onModuleDestroy` calls `$disconnect()`. Interactive transactions use Prisma's default isolation
level (Postgres `Read Committed`).

## Migrations On This Branch

`init`, `add_full_search_text_idx`, `add_order_external_id_to_orders`, `drop_order_refund_item`,
`add_preferred_lang_column_to_user`, `create_table_email_verification_token`.

## Not Implemented Yet

Connection pool tuning ([#11](https://github.com/kelthon/roobra-api/issues/11)) and explicit isolation levels for money-touching transactions ([#12](https://github.com/kelthon/roobra-api/issues/12))
are proposals only, tracked as issues. The audit log is `roobra-docs`'s backlog task 5.1.1.
