---
doc-status: draft
---

# Users Module Reference

**Location:** `src/modules/users/` — verified against branch `feat/api-versioning`, 2026-10-12.

The user's profile and account. Sign-up, sign-in and the password flows stay in the
[auth module](./auth-module.md); sessions are in the [sessions module](./sessions-module.md).

## Endpoints

Both routes use `@UserOnly()` and the global rate limit (20 requests per 60 seconds).

| Method and path | Response | Purpose |
| --- | --- | --- |
| `GET /v1/users/me` | 200 with the profile; 400 when the user does not exist or is deleted | Current user profile: id, email, username, birthdate, photo URL, `emailVerifiedAt`, `createdAt`, `updatedAt` |
| `DELETE /v1/users/me` | 204; 404 when the user does not exist or is already deleted | Soft-deletes the account and revokes every session |

## Account Deletion

`UsersService.delete` sets `deletedAt` and calls `SessionsService.revokeAll` in one database
transaction, so either both happen or neither does. After it:

- the user can no longer refresh: every refresh token is revoked, and `refresh` also ignores deleted
  users;
- an access token already issued stays valid until it expires (`jwt.expiresIn`, 15 minutes), because
  `JwtStrategy` does not check the database;
- the row is kept: `email` and `username` stay taken, and no job anonymizes the data yet.

## Structure

`UsersModule` imports `DatabaseModule` and `SessionsModule`, and exports `UsersService`.

## Decisions

- [Split authentication, users and sessions into three modules](../adr/2026-10-11-01-split-auth-users-and-sessions-modules.md)
- [End a deleted user's sessions by revoking their refresh tokens](../adr/2026-10-11-02-end-deleted-users-sessions-by-revoking-refresh-tokens.md)
