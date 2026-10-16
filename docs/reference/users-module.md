---
doc-status: draft
---

# Users Module Reference

**Location:** `src/modules/users/` — verified against branch `feat/content-api`, 2026-10-16.

The user's profile and account. Sign-up, sign-in and the password flows stay in the
[auth module](./auth-module.md); sessions are in the [sessions module](./sessions-module.md).

## Endpoints

Every route uses `@Authenticated()` and the global rate limit (20 requests per 60 seconds).

| Method and path | Response | Purpose |
| --- | --- | --- |
| `GET /v1/users/me` | 200 with the profile; 401 when the signed-in user no longer exists | Current user profile: id, email, username, birthdate, photo URL, `emailVerifiedAt`, `createdAt`, `updatedAt` |
| `DELETE /v1/users/me` | 204; 401 when the signed-in user no longer exists | Soft-deletes the account and revokes every session |
| `GET /v1/users` | 200 with a paged list; 403 for any role but `ADMIN` and `SUPPORT_AGENT` | Lists users, paged by page: username, email, `createdAt`. Query: `page`, `limit` and `orderBy` by `username`, `email`, `createdAt` or `updatedAt`, newest first by default ([success responses](./success-responses.md#pagination)) |

## Account Deletion

`UsersService.delete` calls `softDelete`, which sets `deletedAt`, and `SessionsService.revokeAll` in
one database transaction, so either both happen or neither does. After it:

- the user can no longer refresh: every refresh token is revoked, and `refresh` also ignores deleted
  users;
- an access token already issued stays valid until it expires (`jwt.expiresIn`, 15 minutes), because
  `JwtStrategy` does not check the database. During that window the routes that look the user up
  answer 401, the status of any invalid token, so the client signs the user out;
- the row is kept: `email` and `username` stay taken, and no job anonymizes the data yet.

## Structure

`UsersModule` imports `DatabaseModule` and `SessionsModule`, and exports `UsersService`.

## Decisions

- [Split authentication, users and sessions into three modules](../adr/2026-10-11-01-split-auth-users-and-sessions-modules.md)
- [End a deleted user's sessions by revoking their refresh tokens](../adr/2026-10-11-02-end-deleted-users-sessions-by-revoking-refresh-tokens.md)
