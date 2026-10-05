---
status: Draft
intended-status: Accepted
date: 2026-09-04
recorded-at: 2026-09-18
source: docs/prisma-global-config.md §4; src/modules/database/prisma.service.ts; commit 1126efd
supersedes:
superseded-by:
---

# Log Prisma Queries In Development Only

## Context

`PrismaClient` with no `log` option prints errors only, with Prisma's own formatting. There was no
way to see the SQL behind a slow endpoint without temporarily editing `PrismaService`.

## Decision

`PrismaService` sets the `log` option from the environment:

- Production: `warn` and `error` to stdout.
- Any other environment: `query`, `warn` and `error` to stdout.

Query logging must never be enabled in production, for noise and because it logs full SQL parameter
values.

## Alternatives Considered

- **Default logging** — rejected: no visibility into N+1 queries or slow endpoints.
- **Forwarding events through Nest's `Logger`** — proposed in the legacy doc (`emit: 'event'`),
  not adopted: the code uses `emit: 'stdout'`. Rationale not recorded.

## Consequences

- Development gets SQL visibility at no cost.
- The environment check depends on a config key being correct (see below).

## Implementation Status

**Diverges from intent.** `PrismaService` reads `config.get('env')`, but no loaded config defines an
`env` key (`app.config.ts` exposes `app.mode`, sourced from `NODE_ENV`). Unless an `env` variable is
set in the process environment, the check is always false and **queries are logged in production
too**. Fixing this (`config.get('app.mode')`) is a code change outside this documentation branch and
is flagged for the reviewer.
