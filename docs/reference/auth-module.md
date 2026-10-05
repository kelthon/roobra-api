# Auth Module Reference

**Location:** `src/modules/auth/` — verified against branch `docs/restructure-documentation`, 2026-09-18.

Authentication and account security for `roobra-api`. Business rules (BR-001, BR-002, BR-011, BR-012) and
the cross-service flow live in `roobra-docs` (`business/rules/`, `architecture/use-cases/auth.md`).
This page describes how the module is implemented.

## Endpoints

Rate limit "strict" means 5 requests per 60 seconds; "global" means the default 20 per 60 seconds
(see [the rate limiting ADR](https://github.com/kelthon/roobra-docs/blob/main/adr/2026-09-11-01-rate-limit-auth-endpoints.md)).

| Method and path | Access | Rate limit | Body | Purpose |
| --- | --- | --- | --- | --- |
| `GET /auth/me` | Authenticated | global | — | Current user profile |
| `POST /auth/register` | Guests only | strict | `RegisterUserDto` | Create account and issue tokens |
| `POST /auth/login` | Guests only, local strategy | strict | `LoginDto` | Issue tokens |
| `POST /auth/logout` | Authenticated | global | `refreshToken` | Revoke one refresh token |
| `POST /auth/logout/all` | Authenticated | global | — | Revoke all active refresh tokens |
| `POST /auth/refresh-token` | Public | strict | `refreshToken` | Rotate tokens |
| `POST /auth/forgot-password` | Public | strict | `email` | Create reset token and email it |
| `POST /auth/reset-password` | Public | strict | `resetToken`, `newPassword`, `confirmNewPassword` | Consume reset token, set password |
| `POST /auth/change-password` | Authenticated | global | current and new password | Change password |
| `GET /auth/verify-email` | Authenticated | global | — | Create verification token and email it |
| `POST /auth/verify-email` | Public | global | `token` | Consume token, set `emailVerifiedAt` |

A global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`) validates every body.

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
| Password reset | 64 hex characters | 5 min (placeholder, not decided) | SHA-256 hash, `password_reset_tokens` | `passwordResetToken.*` |
| Email verification | 64 hex characters | 48 h (placeholder, not decided) | SHA-256 hash, `email_verification_tokens` | `emailVerificationToken.*` |

Why: [refresh tokens](https://github.com/kelthon/roobra-docs/blob/main/adr/2026-09-07-refresh-token-rotation-with-reuse-detection.md),
[hashing](../adr/2026-09-07-02-hash-secrets-by-entropy-argon2-and-sha256.md),
[one-time tokens](../adr/2026-09-11-01-one-time-opaque-tokens-for-reset-and-verification.md).

## Structure

| Piece | File | Notes |
| --- | --- | --- |
| `AuthService` | `auth.service.ts` | Register, login, password flows, email verification |
| `AccessTokenService` | `services/access-token/` | Generate, refresh, revoke, revoke all |
| `PasswordHashService` | `services/password-hash/` | Argon2 |
| `SimpleHashService`, `SimpleTokenService` | `src/common/services/` | SHA-256 and random hex; provided globally by `CommonModule` |
| `JwtStrategy`, `LocalStrategy` | `strategies/` | Bearer JWT; email and password |
| Guards | `guards/` | `jwt-auth`, `optional-jwt`, `forbid-authenticated`, `roles` |

`AuthModule` imports `DatabaseModule`, `NotificationsModule`, `PassportModule` and a `JwtModule`
configured from `jwt.secret` and `jwt.expiresIn`. It exports `AuthService` and `JwtModule`.

## Behavior Notes

- Registration creates the user and the first token pair in one database transaction.
- Lookups by user filter `deletedAt: null` at the call site; nothing enforces it globally.
- `JwtStrategy.validate` returns the payload without checking the database; a `TODO` notes that
  deleted or blocked users are not rejected.
- Roles: `subscriber` (default), `admin`, `content_manager`, `support_agent`, `staff`.
