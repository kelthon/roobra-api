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

`BigInt` values cannot be serialized by `JSON.stringify`. Nothing on this branch converts them, so an
endpoint that returns one directly would fail. This is an open item in
[prisma-global-config.md](../prisma-global-config.md) §2.

## Soft Delete

Eleven models have a nullable `deletedAt`: `User`, `Key`, `StaffMember`, `Subscription`,
`Subscriber`, `Promotion`, `Media`, `MediaVolume`, `MediaChapter`, `MediaPage`, `UserReadList`.
Nothing enforces it globally: each query must filter `deletedAt: null` itself, and deletes must be
updates. `AuthService` does this for `User`.

## Client Configuration

`PrismaService` (`src/modules/database/prisma.service.ts`) extends `PrismaClient` and is the single
place clients are built.

| Option | Value | Decision |
| --- | --- | --- |
| `adapter` | `PrismaPg` with `connectionString` from `database.url`; no pool options, so `pg` defaults apply | — |
| `omit` | `hashedPassword`, `hashedToken` (refresh and password reset), `hashedKey` | [Global omit](../adr/2026-09-04-01-global-omit-for-credential-hashes.md) |
| `log` | `warn`, `error` in production; adds `query` otherwise | [Query logging](../adr/2026-09-04-02-environment-based-prisma-query-logging.md) |

`onModuleDestroy` calls `$disconnect()`. Interactive transactions use Prisma's default isolation
level (Postgres `Read Committed`).

## Migrations On This Branch

`init`, `add_full_search_text_idx`, `add_order_external_id_to_orders`, `drop_order_refund_item`,
`add_preferred_lang_column_to_user`, `create_table_email_verification_token`.

## Not Implemented Yet

Soft-delete enforcement, `BigInt` serialization, connection pool tuning, explicit isolation levels
for money-touching transactions and an audit extension are proposals only, described in
[prisma-global-config.md](../prisma-global-config.md).
