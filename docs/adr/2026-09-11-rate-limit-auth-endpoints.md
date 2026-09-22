---
status: Draft
intended-status: Accepted
date: 2026-09-11
recorded-at: 2026-09-18
source: src/app.module.ts; src/config/throttler.config.ts; src/modules/auth/auth.controller.ts; src/main.ts; commit 4250727
supersedes:
superseded-by:
---

# Rate Limit The API Globally And Auth Endpoints More Strictly

## Context

Credential endpoints are targets for brute force and enumeration. Email-sending endpoints are also
targets for abuse.

## Decision

1. `@nestjs/throttler` is registered globally through an `APP_GUARD` (`ThrottlerGuard`) with a
   default of **20 requests per 60 seconds**, from `throttler.config.ts`.
2. Sensitive auth endpoints override it with `AUTH_THROTTLE`, **5 requests per 60 seconds**:
   `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh-token`,
   `POST /auth/forgot-password` and `POST /auth/reset-password`.
3. `main.ts` sets `trust proxy` to `1`, which changes which client address the throttler sees when
   the API runs behind one reverse proxy.
4. Values come from configuration (default) or a constant in the controller (`AUTH_THROTTLE`).

## Alternatives Considered

Rationale not recorded.

## Consequences

- Limits are per client address; clients behind one shared address share the budget.
- `POST /auth/verify-email` and `GET /auth/verify-email` (which sends an email) use only the global
  limit of 20 per minute.
- Changing the number of proxies in front of the API requires revisiting `trust proxy`.

## Implementation Status

The notifications spec calls this "BR-030". In `roobra-docs`, BR-030 is "Misuse" (account suspension),
not rate limiting, so this ADR does not cite it.
