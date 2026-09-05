# Prisma Client global configuration

This document expands on configuration that should live once, globally, on
[`PrismaService`](../src/modules/database/prisma.service.ts) — the single place every
`PrismaClient` instance in the app is constructed — instead of being repeated (or forgotten) at
each call site. Each section explains the problem, why it belongs at the client level rather than
per-query, and what already depends on the current (missing) behavior.

## 1. Global `omit` for credential hashes

**Problem:** four fields across the schema exist only so the app can *compare* a secret, never so
it can be *read back out*: `User.hashedPassword`, `RefreshToken.hashedToken`,
`PasswordResetToken.hashedToken`, `Key.hashedKey`. Without an explicit `select`, any plain
`findUnique`/`findMany` on these models returns the hash in the result object. Nothing stops a
future `return user` in a controller from leaking it in a JSON response.

**Fix:** Prisma Client's [`omit`](https://www.prisma.io/docs/orm/prisma-client/queries/excluding-fields)
option, set once at construction, applies to every query on that client — no need to remember
`select`/`omit` at each call site:

```ts
// src/modules/database/prisma.service.ts
super({
  adapter,
  omit: {
    user: { hashedPassword: true },
    refreshToken: { hashedToken: true },
    passwordResetToken: { hashedToken: true },
    key: { hashedKey: true },
  },
});
```

The keys are the **client accessor names** (`prisma.user`, `prisma.refreshToken`, …), i.e.
lowerCamelCase, not the PascalCase model name from the schema.

**What this does *not* need to touch:** any query that already uses an explicit `select` is
unaffected — `select` is exhaustive by definition, so the global `omit` never applies to it. That
covers [`auth.service.ts:231-233`](../src/modules/auth/auth.service.ts#L231-L233)
(`select: { hashedPassword: true }` inside `changePassword`).

**What this *does* break, and must be fixed alongside it:** two call sites read
`user.hashedPassword` off a result that comes from a plain `findUnique`/`findUniqueOrThrow` with no
`select`:

| Call site | Line | Fix |
| --- | --- | --- |
| `AuthService.validateUser` | [auth.service.ts:59-69](../src/modules/auth/auth.service.ts#L59-L69) | add `omit: { hashedPassword: false }` to the `findUnique` call |
| `AuthService.login` | [auth.service.ts:126-132](../src/modules/auth/auth.service.ts#L126-L132) | same |

`omit: { hashedPassword: false }` at the query level explicitly opts back into the field for that
one query, overriding the client-level default — the same mechanism, just flipped locally.

Writes (`create`/`update` with `data: { hashedPassword: ... }`) and lookups by hash
(`where: { hashedToken: ... }`) are **never** affected by `omit` — it only shapes what comes back
out, not what goes into `where`/`data`. That is why `refresh-tokens.service.ts` needs no changes:
it only ever writes `hashedToken`, never reads it back from a result.

## 2. `BigInt` JSON serialization

**Problem:** most models use `BigInt` primary keys (`@id @default(autoincrement())`):
`AuditLog`, `MediaChapter`, `Media`, `MediaPage`, `MediaVolume`, `OrderItem`, `Order`,
`OrderRefundItem`, `OrderRefund`, `PasswordResetToken`, `Promotion`, `PromotionUsage`,
`RefreshToken`, `Subscriber`, `Subscription`, `UserHistory`, `UserReadList`. (`Key`, `MediaGenre`,
`StaffMember` use `Int`; `User` uses a `String` nanoid — those three families are unaffected.)

Node's native `JSON.stringify` throws `TypeError: Do not know how to serialize a BigInt` the
moment it encounters a `bigint` value. Nest's default response pipeline calls `JSON.stringify`
under the hood (via Express's `res.json`), so the **first** controller that returns one of these
records as-is — or an object containing one, even nested in a relation — will 500 in production.
This has not surfaced yet only because no endpoint currently serializes one of these models
directly; it is latent, not hypothetical.

**Fix — pick one:**

- **Global polyfill** (simplest, one line, affects the whole process):

  ```ts
  // src/main.ts, before app.listen()
  (BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
    return this.toString();
  };
  ```

  Every `BigInt` in any response becomes a string. Simple, but silently changes the wire type for
  *every* numeric-looking ID in every response body — API consumers must treat all IDs as strings
  (which, given `User.id` already is a string nanoid, is arguably already the app's convention).

- **Scoped, via `class-transformer`**: since `class-validator`/`class-transformer` are already
  dependencies, a `@Transform(({ value }) => value.toString())` on each BigInt-backed DTO field
  paired with Nest's `ClassSerializerInterceptor` avoids a process-wide monkeypatch, at the cost of
  annotating every DTO that carries one of these IDs.

Given how many models are affected, and that nothing in the codebase currently relies on IDs being
numbers on the wire, the global polyfill is the pragmatic default; revisit only if a specific
consumer needs numeric IDs.

## 3. Soft delete is not enforced anywhere

**Problem:** eleven models carry a `deletedAt` column meant to mark a row as soft-deleted: `User`,
`Subscriber`, `StaffMember`, `Media`, `MediaVolume`, `MediaChapter`, `MediaPage`, `Promotion`,
`Subscription`, `Key`, `UserReadList`. Nothing in `src/` filters on it — confirmed by grep, there
is no `deletedAt: null` anywhere in application code today. Every `find*` on these models is
expected to remember to add that filter by hand, and every "delete" flow is expected to remember
to `update` instead of `delete`. Nothing enforces either, so it is a matter of when, not if, a
soft-deleted row leaks into a listing or a `delete()` call hard-deletes a row that downstream code
still expects to find (e.g. an `Order` referencing a soft-deleted `Promotion`).

**Fix:** Prisma's query-level middleware (`$use`) is deprecated; the supported mechanism is a
[client extension](https://www.prisma.io/docs/orm/prisma-client/client-extensions) applied once in
`PrismaService`:

```ts
const SOFT_DELETE_MODELS = [
  'user', 'subscriber', 'staffMember', 'media', 'mediaVolume', 'mediaChapter',
  'mediaPage', 'promotion', 'subscription', 'key', 'userReadList',
] as const;

// applied via this.$extends(...) in the PrismaService constructor
{
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (!model || !SOFT_DELETE_MODELS.includes(toCamelCase(model))) return query(args);

        if (['findUnique', 'findFirst', 'findMany', 'count'].includes(operation)) {
          args.where = { ...args.where, deletedAt: null };
        }
        if (operation === 'delete') {
          return query({ ...args, __proto__: null }); // see caveat below
        }
        return query(args);
      },
    },
  },
}
```

This needs to be scoped carefully rather than copy-pasted as-is — extensions apply per Prisma
Client *instance*, and `PrismaService extends PrismaClient` currently, which does not compose
cleanly with `$extends` (which returns a new, differently-typed client rather than mutating `this`).
The realistic path is switching `PrismaService` from *extending* `PrismaClient` to *wrapping* an
extended client instance, which is a slightly bigger structural change than the other items here —
worth a short follow-up task rather than a drive-by edit.

## 4. Query logging

**Problem:** `super({ adapter })` passes no `log` option, so `PrismaClient` uses its own default
(errors only, printed with Prisma's internal formatting, not through Nest's `Logger`). There is no
way today to see the actual SQL a slow endpoint is issuing without temporarily hand-editing this
file.

**Fix:** environment-driven log levels, forwarded through Nest's logger instead of `console`:

```ts
super({
  adapter,
  log: config.get('env') === 'production'
    ? [{ level: 'warn', emit: 'stdout' }, { level: 'error', emit: 'stdout' }]
    : [{ level: 'query', emit: 'stdout' }, { level: 'warn', emit: 'stdout' }, { level: 'error', emit: 'stdout' }],
});
```

Query-level logging in development costs nothing and pays for itself the first time an N+1 needs
diagnosing; it should never be `query` in production, both for noise and because it will log full
SQL parameter values.

## 5. Connection pool tuning on the `pg` adapter

**Problem:** `new PrismaPg({ connectionString })` in
[prisma.service.ts:10](../src/modules/database/prisma.service.ts#L10) passes no pool
configuration, so it inherits `node-postgres`'s defaults (`max: 10` connections, no idle/connection
timeouts configured beyond the driver's own defaults). That is a reasonable default for a single
long-lived process, but has two failure modes worth deciding on deliberately rather than by
accident:

- If the API ever scales to multiple instances/replicas, `10 × instance count` connections must
  stay under Postgres's `max_connections` — with no explicit ceiling, this is easy to blow past
  silently.
- No `idleTimeoutMillis`/`connectionTimeoutMillis` means a network blip can leave a query hanging
  with no clear timeout signal back to the caller.

**Fix:** pass pool options explicitly and pull the ceiling from config:

```ts
const adapter = new PrismaPg({
  connectionString,
  max: config.get<number>('database.poolMax') ?? 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});
```

This is a "decide the number on purpose" change more than an urgent fix — flagging it now so the
default isn't inherited by accident once there is more than one API instance.

## 6. Explicit isolation level for money-touching transactions

**Problem:** `Order → OrderItem → OrderRefund → OrderRefundItem` and `PromotionUsage` all touch
money or a limited resource (`Promotion.maxUses`). Prisma's interactive transactions default to
the database's default isolation level (Postgres: `Read Committed`), which does **not** prevent
two concurrent refund requests on the same `Order`, or two concurrent redemptions of a
`Promotion` near its `maxUses` limit, from both reading a stale count and both succeeding when
only one should.

**Fix:** for the specific transactions that mutate these models, pass an explicit isolation level
rather than relying on the connection default:

```ts
await this.prisma.$transaction(
  async (tx) => {
    /* refund / promotion-usage logic */
  },
  { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
);
```

`Serializable` means the transaction must retry on a serialization failure — callers need a retry
wrapper around these specific transactions once this is adopted. This is scoped to the handful of
money-sensitive transactions, not a global client default, since `Serializable` has a real
throughput cost and most reads in the app do not need it.

## 7. `AuditLog` is not populated by anything yet

**Problem:** the `AuditLog` model
([audit-log.model.prisma](../prisma/models/audit-log.model.prisma)) exists in the schema, but a
grep of `src/` for anything writing to `prisma.auditLog` turns up nothing — it is modeled but
unused. Left as-is, every service that should audit something (role changes, `Key` issuance,
`Promotion` edits) has to remember to call `prisma.auditLog.create(...)` by hand, which is exactly
the kind of thing that gets forgotten on one code path and shows up as a gap during an incident
review.

**Fix:** once the soft-delete extension (§3) exists, an audit extension can piggyback on the same
`$allOperations` hook, writing an `AuditLog` row after `create`/`update`/`delete` on a short list of
sensitive models (`User`, `Key`, `Promotion`, `StaffMember`). This depends on request-scoped
context (the acting `userId`) being available to the extension — which `PrismaService` does not
currently have, since it is a singleton, not request-scoped. That plumbing (e.g. via
`nestjs-cls` or a request-scoped provider) is a prerequisite, not a detail, so this item is the
last one to tackle of the seven.

## Suggested order

1. **§1 `omit`** and **§2 `BigInt`** — both are close to zero-risk and close a real, already-latent
   gap (a leaked hash; a 500 on the first BigInt response).
2. **§4 logging** — trivial, no behavior change, immediate debugging value.
3. **§3 soft delete** — real gap, but the `PrismaService` structural change (wrap instead of
   extend) needs its own pass and test coverage.
4. **§5 pool tuning** and **§6 isolation level** — not urgent at current scale; worth deciding
   deliberately before the first horizontal scale-out or the first concurrent-refund incident,
   whichever comes first.
5. **§7 audit extension** — blocked on request-scoped context existing at all; revisit once that
   exists for other reasons (e.g. request-id propagation, current-user access in services).
