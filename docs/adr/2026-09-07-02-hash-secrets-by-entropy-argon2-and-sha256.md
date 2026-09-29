---
status: Draft
intended-status: Accepted
date: 2026-09-07
recorded-at: 2026-09-18
source: src/modules/auth/services/password-hash/password-hash.service.ts; src/common/services/simple-hash/simple-hash.service.ts; src/common/services/simple-token/simple-token.service.ts; commit 17cdab9
supersedes:
superseded-by:
---

# Hash Passwords With Argon2 And Random Tokens With SHA-256

## Context

The API stores two kinds of secret proofs: user passwords, and server-generated tokens (refresh,
password reset, email verification). The commit that introduced the token hashing states the choice
("opaque token service and SHA-256 hash service") but not the reasoning; the reasoning below is
inferred from how the code uses each hash and should be confirmed by the authors.

## Decision

| Secret | Generator | Stored as | Service |
| --- | --- | --- | --- |
| Password | chosen by the user | Argon2 hash in `users.hashed_password` | `PasswordHashService` (`argon2`) |
| Refresh, reset and verification tokens | `SimpleTokenService` (`crypto.randomBytes`, hex) | SHA-256 hex in `hashed_token` (unique) | `SimpleHashService` |

- Passwords are low-entropy, so they use a slow, salted hash. The hash cannot be looked up, so login
  fetches the user by email and then verifies.
- Tokens are high-entropy random values, so a fast hash is enough and it is **deterministic**: the
  token presented by a client is hashed and looked up directly through the unique `hashed_token`
  column.
- `SimpleHashService.verify` compares with `crypto.timingSafeEqual`.
- The raw token is only ever sent to the user (in a response or an email); the database holds only
  the hash.

## Alternatives Considered

Rationale not recorded. The inference above is why Argon2 was not used for tokens (it would prevent
lookup by hash) and SHA-256 was not used for passwords (too fast against guessing).

## Consequences

- A database leak does not reveal usable refresh, reset or verification tokens, nor passwords.
- Any new token type should follow the same generator and hash pair. Any new user-chosen secret
  should use `PasswordHashService`.
