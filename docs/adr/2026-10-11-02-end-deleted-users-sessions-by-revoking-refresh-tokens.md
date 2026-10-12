---
status: Draft
intended-status: Accepted
date: 2026-10-11
recorded-at: 2026-10-12
source: 'issue #2 (JwtStrategy accepts access tokens of deleted or blocked users), branch fix/GH-2-revoke-sessions-of-deleted-users'
supersedes:
superseded-by:
---

# End A Deleted User's Sessions By Revoking Their Refresh Tokens

## Context

`JwtStrategy.validate` returned the token payload without reading the database, with a `TODO` for
deleted and blocked users. Access tokens are stateless and live 15 minutes
([roobra-docs ADR](https://github.com/kelthon/roobra-docs/blob/main/adr/2026-04-14-stateless-jwt-access-tokens.md)),
so a user deleted after signing in could keep using the API, and keep refreshing for up to the
7-day lifetime of a refresh token.

## Decision

Deleting a user revokes every refresh token of that user in the same transaction that sets
`deletedAt`, and `SessionsService.refresh` ignores deleted users. `JwtStrategy` keeps not checking
the database: an access token already issued stays valid until it expires, at most 15 minutes.

Blocking a user is not built yet; account suspension (`roobra-docs` backlog task 5.3.4) will end
sessions the same way.

## Alternatives Considered

- **Check the database in `JwtStrategy` on every request** — closes the window, but adds a query
  to every authenticated request and gives up most of what a stateless access token is for.
- **Check the database only on sensitive routes** — a middle ground with nothing that needs it yet:
  no route changes roles or takes payments.

## Consequences

- A deleted user keeps access for at most the remaining lifetime of their access token.
- The `role` claim of an access token can be up to 15 minutes old. Changing a user's role must also
  revoke their sessions once such a feature exists.
- No query is added to authenticated requests.
