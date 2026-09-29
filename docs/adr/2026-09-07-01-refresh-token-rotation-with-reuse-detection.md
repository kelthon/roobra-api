---
status: Draft
intended-status: Accepted
date: 2026-09-07
recorded-at: 2026-09-18
source: src/modules/auth/services/access-token/access-token.service.ts; src/config/jwt.config.ts; commits dab2013, 2ecd314
supersedes:
superseded-by:
---

# Use Short-Lived JWT Access Tokens And Rotating Opaque Refresh Tokens With Reuse Detection

## Context

The API needs stateless authentication for requests and a way to keep sessions alive and revoke
them individually or all at once.

## Decision

1. **Access token:** a signed JWT with claims `sub`, `email`, `username` and `role`, valid for 15
   minutes. It is read from the `Authorization: Bearer` header and is not revocable before expiry.
2. **Refresh token:** an opaque random value (64 hex characters), valid for 7 days, stored only as a
   SHA-256 hash in `refresh_tokens` ([hashing ADR](./2026-09-07-02-hash-secrets-by-entropy-argon2-and-sha256.md)).
3. **Rotation:** every refresh revokes the presented token and issues a new access and refresh pair.
4. **Reuse detection:** presenting a token that is already revoked revokes **all** the user's active
   refresh tokens and fails the request. Logout revokes one token; logout-all revokes every active
   one.
5. Register issues its first token pair inside the same database transaction that creates the user.

## Alternatives Considered

Rationale not recorded for alternatives such as long-lived JWTs, server-side sessions or a token
denylist. The recorded reasoning is the reuse-detection commit: a stolen, already-rotated token
should invalidate the whole session family.

## Consequences

- A leaked access token stays valid for up to 15 minutes; a leaked refresh token is usable once
  before rotation makes reuse detectable.
- A legitimate client that retries a refresh after a lost response will trip reuse detection and be
  logged out everywhere.
- Every refresh is a database write.

## Implementation Status

`JwtStrategy.validate` returns the payload as-is and carries a `TODO` for deleted or blocked users,
so a soft-deleted user keeps a valid access token until it expires.
