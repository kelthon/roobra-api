---
status: Draft
intended-status: Accepted
date: 2026-09-11
recorded-at: 2026-09-18
source: src/modules/auth/auth.service.ts; src/config/password-reset-token.config.ts; src/config/email-verification-token.config.ts; commits d0ac698, e2db0ca, e1b2cfb
supersedes:
superseded-by:
---

# Use Single-Use Opaque Tokens For Password Reset And Email Verification

## Context

Password recovery (BR-011) and email verification (BR-012) in `roobra-docs` require a secure link sent
to the user's email. The link must be safe to leak into an inbox, expire quickly and work only once.

## Decision

1. Both flows use the same mechanism: an opaque random hex token (64 characters) from
   `SimpleTokenService`, stored only as a SHA-256 hash in its own table
   (`password_reset_tokens`, `email_verification_tokens`) with `expiresAt` and `usedAt`.
2. Lifetimes, set in `password-reset-token.config.ts` and `email-verification-token.config.ts`:
   password reset **30 minutes**, email verification **24 hours**. Decided on 2026-09-24; both were
   test placeholders (5 minutes and, briefly, 48 hours) before that.
3. A token is accepted only if it exists by hash, `usedAt` is null and `expiresAt` is in the future.
   Consuming it sets `usedAt` in the same transaction as the effect (password update, or
   `emailVerifiedAt`).
4. The link is built from `app.frontendUrl`, so the frontend owns the page and posts the token back:
   `POST /auth/reset-password` and `POST /auth/verify-email`.
5. Reset tokens are **not** JWTs. Commit `e1b2cfb` fixed `ResetPasswordDto`, which had required a JWT
   although `forgotPassword` issues hex tokens.

## Alternatives Considered

- **Signed JWT as reset token** — not used; the fix in `e1b2cfb` aligned validation with the opaque
  token actually issued. Rationale for opaque over JWT is not otherwise recorded; it is consistent
  with [the hashing ADR](./2026-09-07-02-hash-secrets-by-entropy-argon2-and-sha256.md), which makes
  tokens revocable and single-use through the database.

## Consequences

- Tokens can be invalidated and audited by row; the cost is a table and a lookup per use.
- The stored hash means a lost email link cannot be re-displayed; the user must request a new one.
- Requesting a new token does not invalidate earlier unexpired ones.

## Implementation Status

Both flows are implemented. `forgotPassword` gives the same answer whether or not an account exists
for the email (decided 2026-09-24), so it cannot be used to discover which emails are registered; it
does not recover soft-deleted accounts. The time the request takes still differs (an existing account
saves a token and sends an email), which the rate limit makes impractical to exploit but does not
remove.
