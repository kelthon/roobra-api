---
doc-status: draft
---

# Success Responses Reference

**Location:** `src/common/interceptors/response/`, `src/common/decorators/response/`,
`src/common/utils/pagination/`, `src/common/dto/base-pagination-params-dto.ts`,
`src/shared/interfaces/paged-response.interface.ts` and `src/shared/types/pagination-meta.type.ts` —
verified against branch `feat/content-api`, 2026-10-15.

Every successful response with a body puts it under `data`. A paged list adds `meta`. Errors are
answered as problem details instead ([error responses](./error-responses.md)), and `GET /health`
keeps Terminus's report (see the [health module](./health-module.md)).

## Format

A resource, or a list that is not paged, such as `GET /v1/auth/sessions`:

```json
{
  "data": { "id": "V1StGXR8_Z5jdHi6B-myT", "email": "user@roobra.test" }
}
```

A paged list:

```json
{
  "data": [{ "id": "42", "name": "Example" }],
  "meta": {
    "paginationType": "page",
    "page": 2,
    "limit": 10,
    "totalPages": 5,
    "totalItems": 42,
    "nextPageURI": "?page=3&limit=10&orderBy=createdAt%3Adesc",
    "previousPageURI": "?page=1&limit=10&orderBy=createdAt%3Adesc"
  }
}
```

| Case | Body |
| --- | --- |
| A resource or a list | `{ "data": ... }`, whatever the route returned, `null` included |
| A paged list | `{ "data": [...], "meta": {...} }`, built by the route |
| No content (`DELETE /v1/users/me`, 204) | None |
| A file (`StreamableFile`) | The file |
| A route marked `@RawResponse()` (`GET /health`) | What the route returned |

No route is paged yet; the content routes of milestone 2 are the first.

## Pagination

### Query Parameters

| Parameter | Rule | Default |
| --- | --- | --- |
| `page` | Integer, 1 or more | `1` |
| `limit` | Integer, from 1 to 100 | `10` |
| `orderBy` | `field:asc` or `field:desc`, repeatable; each route lists its fields | Set by the route |
| `cursor` | An opaque cursor from a previous `nextCursor` | None |

`BasePaginationParamsDto` declares `page` and `limit`. A list route extends it with its own
`orderBy`, validated by `@IsOrderByField(fields)`, and `cursor` when it pages by cursor. An invalid
parameter is a `validation-failed` problem.

`paginate` turns the parameters into Prisma's `skip`, `take` and `cursor`: by cursor when one is
given, otherwise by page. `parseOrderByParams` turns `orderBy` into Prisma's list and appends
`{ id: 'asc' }` unless the order already uses `id`, so rows that share the sorted values keep the
same order on every page.

### Meta

| Field | Pagination | Content |
| --- | --- | --- |
| `paginationType` | Both | `page` or `cursor` |
| `page`, `limit` | Page | The page sent and its size |
| `totalPages`, `totalItems` | Page | Totals of the whole list |
| `nextPageURI`, `previousPageURI` | Page | The query string of the next or previous page, keeping `limit`, `orderBy` and any filter. A relative reference the client resolves against the URL it called. Missing on the last or the first page |
| `cursor` | Cursor | The cursor sent |
| `nextCursor` | Cursor | The cursor of the next page. Missing on the last page |

### Cursor

A cursor is the row a page continues after, as JSON encoded in base64url:
`{ "createdAt_id": { "createdAt": "<ISO date>", "id": "<id>" } }`. The key matches the
`@@unique([createdAt, id])` of `Media` and `User`. A client never reads or builds a cursor; it sends
back the `nextCursor` it received.

`decodeCursor` keeps only `createdAt` and `id`, and answers anything that is not base64url JSON with
an ISO date and an id (a non-empty string or an integer) with an `invalid-cursor` problem (400). The
id of a `BigInt` key arrives as a string and must be converted before querying.

## How It Works

- `ResponseInterceptor` is registered as `APP_INTERCEPTOR` in `AppModule`, so it applies to every
  route, and the e2e specs, which import `AppModule`, test it too.
- It tells a paged response from a resource by its shape (`isPagedResponse`): a `data` list and a
  `meta` whose `paginationType` is `page` or `cursor`.
- `@RawResponse()` sets metadata that the interceptor reads from the handler, then the controller.
  `HealthController` carries it.
- An error never reaches the interceptor: it is thrown past it to `AllExceptionsFilter`.

## Decisions

- [Answer successes in a data envelope and page lists by page or cursor](https://github.com/kelthon/roobra-docs/blob/main/adr/2026-10-15-answer-successes-in-a-data-envelope-and-page-lists.md)
- [Send BigInt ids as strings](https://github.com/kelthon/roobra-docs/blob/main/adr/2026-10-14-send-bigint-ids-as-strings.md)
