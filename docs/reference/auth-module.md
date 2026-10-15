---
doc-status: draft
---

# Auth Module Reference

**Location:** `src/modules/auth/` — verified against branch `feat/GH-10-soft-delete`, 2026-10-14.

Authentication and account security for `roobra-api`. Business rules (BR-001, BR-002, BR-011, BR-012) and
the cross-service flow live in `roobra-docs` (`business/rules/`, `architecture/use-cases/auth.md`).
This page describes how the module is implemented. Sessions (refresh tokens) are in the
[sessions module](./sessions-module.md) and the profile and account deletion in the
[users module](./users-module.md).

## Endpoints

Every route is under `/v1`: `configureApp` in `src/app.setup.ts` enables URI versioning with `1` as
the default version, for `main.ts` and the e2e specs alike.

Rate limit "strict" means 5 requests per 60 seconds; "global" means the default 20 per 60 seconds
(see [the rate limiting ADR](https://github.com/kelthon/roobra-docs/blob/main/adr/2026-09-11-01-rate-limit-auth-endpoints.md)).

| Method and path | Access | Rate limit | Body | Purpose |
| --- | --- | --- | --- | --- |
| `POST /v1/auth/register` | Guests only | strict | `RegisterUserDto` | Create account and issue tokens |
| `POST /v1/auth/login` | Guests only, local strategy | strict | `LoginDto` | Issue tokens |
| `POST /v1/auth/logout` | Authenticated | global | `refreshToken` | Revoke one refresh token |
| `POST /v1/auth/logout/all` | Authenticated | global | — | Revoke all active refresh tokens; 404 when there is none |
| `GET /v1/auth/sessions` | Authenticated | global | — | List the active sessions, newest first, without their tokens |
| `POST /v1/auth/refresh-token` | Public | strict | `refreshToken` | Rotate tokens |
| `POST /v1/auth/forgot-password` | Public | strict | `email` | Create reset token and email it. Always answers the same, whether or not the email is registered |
| `POST /v1/auth/reset-password` | Public | strict | `resetToken`, `newPassword`, `confirmNewPassword` | Consume reset token, set password |
| `POST /v1/auth/change-password` | Authenticated | global | current and new password | Change password |
| `GET /v1/auth/verify-email` | Authenticated | global | — | Create verification token and email it |
| `POST /v1/auth/verify-email` | Public | global | `token` | Consume token, set `emailVerifiedAt` |

A global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`), also set by
`configureApp`, validates every body and answers an invalid one with a `validation-failed` problem.

Errors are problem details ([error responses](./error-responses.md)). The routes of this module raise
these types:

| Route | Problem type |
| --- | --- |
| `POST /v1/auth/register` | `email-in-use` or `username-in-use` (409) |
| `POST /v1/auth/login` | `invalid-credentials` (401) |
| `POST /v1/auth/reset-password`, `POST /v1/auth/verify-email` | `invalid-token` (400) when the token does not exist, was used or has expired |
| `POST /v1/auth/change-password` | `incorrect-password` (400) |

A signed-in user deleted while their access token is still valid gets a 401 `about:blank` problem from
`POST /v1/auth/change-password` and `GET /v1/auth/verify-email`, and `invalid-credentials` from
`POST /v1/auth/login` when the account is deleted between the password check and the token issue.

## Route Access Decorators

| Decorator | Guards applied | Effect |
| --- | --- | --- |
| `@UserOnly()` | `JwtAuthGuard` | Requires a valid access token |
| `@GuestOnly()` | `OptionalJwtAuthGuard`, `ForbidAuthenticatedGuard` | Rejects requests that carry a valid access token |
| `@LoginWith('local')` | Passport `AuthGuard('local')` | Validates email and password through `AuthService.validateUser` |
| `@Roles(...)` with `RolesGuard` | Role check against the JWT `role` claim | **Registered but not applied to any route yet.** Groundwork for content-mutation routes in Milestone 2 (`roobra-docs` `management/backlog.md`, tasks 1.2.1 and 1.2.3) |

`@User()` injects the authenticated user as `UserDto`, mapping the JWT `sub` claim to `id`.

## Tokens

| Token | Format | Lifetime | Stored | Config key |
| --- | --- | --- | --- | --- |
| Access | JWT (`sub`, `email`, `username`, `role`) | 15 min | No | `jwt.expiresIn` |
| Refresh | 64 hex characters | 7 days | SHA-256 hash, `refresh_tokens` | `refreshToken.*` |
| Password reset | 64 hex characters | 30 min | SHA-256 hash, `password_reset_tokens` | `passwordResetToken.*` |
| Email verification | 64 hex characters | 24 h | SHA-256 hash, `email_verification_tokens` | `emailVerificationToken.*` |

Why: [refresh tokens](https://github.com/kelthon/roobra-docs/blob/main/adr/2026-09-07-refresh-token-rotation-with-reuse-detection.md),
[hashing](../adr/2026-09-07-02-hash-secrets-by-entropy-argon2-and-sha256.md),
[one-time tokens](../adr/2026-09-11-01-one-time-opaque-tokens-for-reset-and-verification.md).

## Structure

| Piece | File | Notes |
| --- | --- | --- |
| `AuthService` | `auth.service.ts` | Register, login, password flows, email verification |
| `PasswordHashService` | `services/password-hash/` | Argon2 |
| `SimpleHashService`, `SimpleTokenService` | `src/common/services/` | SHA-256 and random hex; provided globally by `CommonModule` |
| `JwtStrategy`, `LocalStrategy` | `strategies/` | Bearer JWT; email and password |
| Guards | `guards/` | `jwt-auth`, `optional-jwt`, `forbid-authenticated`, `roles` |

`AuthModule` imports `DatabaseModule`, `NotificationsModule`, `PassportModule` and `SessionsModule`,
which signs the tokens. It exports `AuthService`. `JwtStrategy` verifies access tokens with the same
`jwt.secret`; it is registered here and applies to every route that uses `@UserOnly()`, in any module.

## Behavior Notes

- Registration creates the user and the first token pair in one database transaction.
- Lookups by user skip deleted users through the soft delete extension of the Prisma client (see
  the [Prisma setup](./prisma-setup.md#soft-delete)); no call site filters `deletedAt` itself.
- `JwtStrategy.validate` rejects a token without a `sub` claim and otherwise returns the payload
  without checking the database. Deleting a user revokes their refresh tokens, so an access token
  already issued stays valid until it expires (`jwt.expiresIn`, 15 minutes). Blocking a user does not
  exist yet ([why](../adr/2026-10-11-02-end-deleted-users-sessions-by-revoking-refresh-tokens.md)).
- Roles: `subscriber` (default), `admin`, `content_manager`, `support_agent`.
