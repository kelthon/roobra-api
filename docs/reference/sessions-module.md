---
doc-status: draft
---

# Sessions Module Reference

**Location:** `src/modules/sessions/` — verified against branch `feat/exception-filter`, 2026-10-13.

Issues, rotates and revokes the tokens of a signed-in user. A session is one row of `refresh_tokens`:
it starts at sign-in and ends when its refresh token is revoked or expires. The module has no
controller; its routes are under `/auth` (see the [auth module](./auth-module.md)), and the
[users module](./users-module.md) uses it to end the sessions of a deleted account.

## `SessionsService`

| Method | Does | Used by |
| --- | --- | --- |
| `generate(user, tx?)` | Signs an access token and stores a new refresh token, optionally in the caller's transaction | Register, login, `refresh` |
| `getActive(userId)` | Lists the active sessions (user agent, operating system, `createdAt`, `expiresAt`), newest first, without their tokens | `GET /v1/auth/sessions` |
| `refresh(refreshToken)` | Revokes the presented token and issues a new pair. An unknown or expired token is an `invalid-token` problem (400). A revoked token is treated as reuse: it revokes every session of its user and is an `invalid-token` problem too. A user who is missing or soft-deleted gets a 404 | `POST /v1/auth/refresh-token` |
| `revoke(userId, refreshToken)` | Revokes one active token of the user; 404 when none matches | `POST /v1/auth/logout` |
| `revokeAll(userId, tx?)` | Revokes every active token of the user, optionally in the caller's transaction, and returns how many. Revoking none is not an error | `POST /v1/auth/logout/all`, reuse detection, account deletion |

Token formats, lifetimes and config keys are listed in the
[auth module's token table](./auth-module.md#tokens).

## Structure

`SessionsModule` imports `ConfigModule`, `DatabaseModule` and a `JwtModule` configured from
`jwt.secret` and `jwt.expiresIn`, and exports `SessionsService`. `SimpleHashService` and
`SimpleTokenService` come from the global `CommonModule`.

## Decisions

- [Split authentication, users and sessions into three modules](../adr/2026-10-11-01-split-auth-users-and-sessions-modules.md)
- [End a deleted user's sessions by revoking their refresh tokens](../adr/2026-10-11-02-end-deleted-users-sessions-by-revoking-refresh-tokens.md)
- [Short-lived JWT access tokens and rotating refresh tokens with reuse detection](https://github.com/kelthon/roobra-docs/blob/main/adr/2026-09-07-refresh-token-rotation-with-reuse-detection.md)
