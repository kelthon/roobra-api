---
status: Draft
intended-status: Accepted
date: 2026-10-16
recorded-at: 2026-10-16
source: 'branch feat/content-api (pagination meta for the content API of milestone 2)'
supersedes:
superseded-by:
---

# Count Paged Lists With A Prisma Client Extension

## Context

A list paged by page answers its `totalItems`
([success and pagination ADR](https://github.com/kelthon/roobra-docs/blob/main/adr/2026-10-15-answer-successes-in-a-data-envelope-and-page-lists.md)),
so each such list runs two queries: `findMany` for the page and `count` for the total, with the same
`where`. Milestone 2 adds a paged list for each content model. Prisma has no method that does both,
and the `count` arguments are not those of `findMany`: `omit`, `cursor`, `skip` and `take` either
fail or change the total.

## Decision

A client extension, `findManyAndCountExtension`
(`src/modules/database/extensions/find-many-and-count/`), adds `findManyAndCount(args)` to every
model. It takes the arguments of `findMany` and returns `[rows, total]`:

- **Typed like `findMany`.** The rows take the type of the `select` or `include` passed, with
  `Prisma.Args` and `Prisma.Result`.
- **The count reuses only `where`.**
- **Both queries run through the delegate the method is called on**, so the soft delete extension
  filters both, and the method works inside an interactive transaction.
- **The queries run with `Promise.all`**, not with `$transaction([...])`.

The extension returns the numbers only: the pagination utilities build the `meta`, since they know
the query.

## Alternatives Considered

- **Two queries in each service** — explicit and simple, but repeated in every list, where a
  forgotten `where` in the count gives a wrong total.
- **`$transaction([findMany, count])`** — one snapshot, so the total always matches the page. Not
  chosen: the client of an interactive transaction has no `$transaction`, so the method would fail
  inside one, and the two queries would run one after the other on one connection.
- **Remove the paging fields from the `findMany` arguments for the count** — what the first draft
  did. Any field Prisma adds to `findMany` later, as `omit` was, would reach `count` and fail.
- **Build the whole paged response in the extension** — it would tie the database layer to the HTTP
  format and to the query string the `meta` links carry.

## Consequences

- A paged list is one call, and its total cannot use another `where`.
- The total can be off by the rows written between the two queries.
- With `distinct`, the total counts every row `where` matches, not the distinct ones.
- The extension's generic signature is hard to read: it is documented where it is declared, and its
  typing is checked by the services that call it.
