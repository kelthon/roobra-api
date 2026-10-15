---
doc-status: draft
---

# Error Responses Reference

**Location:** `src/common/filters/all-exceptions/`, `src/common/exceptions/`,
`src/shared/types/problem.type.ts` and `src/shared/interfaces/problem.interface.ts` — verified against
branch `feat/exception-filter`, 2026-10-13.

Every error is answered as problem details ([RFC 9457](https://www.rfc-editor.org/rfc/rfc9457)),
with the `Content-Type` `application/problem+json`. The one exception is `GET /health`, which
answers a failed check with Terminus's report (see the [health module](./health-module.md)).

## Format

```json
{
  "type": "https://api.roobra.com/problems/validation-failed",
  "title": "Validation failed",
  "status": 400,
  "detail": "The request has 1 invalid field.",
  "instance": "/v1/auth/register",
  "requestId": "dc03183a-d9a3-438e-800d-663c873d071b",
  "errors": [{ "field": "email", "messages": ["email must be an email"] }]
}
```

| Field | Always | Content |
| --- | --- | --- |
| `type` | Yes | What went wrong. A client tells errors apart by this field, never by `title` or `detail`. `about:blank` when the status says it all |
| `title` | Yes | A short English summary of the type: the type's title, or the HTTP status phrase for `about:blank` |
| `status` | Yes | The HTTP status, the same as the response's |
| `detail` | No | What went wrong in this occurrence, in English. Left out when it would repeat `title` |
| `instance` | Yes | The request path, without the query string |
| `requestId` | No | The request id, the same as the `X-Request-Id` response header and the logs. Missing when the request failed before it got one: Express rejects a malformed JSON body before `pino-http` runs |
| `errors` | No | Only in `validation-failed`: each invalid field, named by its path (`address.zip` when nested), with every rule it broke |

`title` and `detail` are written for developers. A client shows its own, translated message for the
`type`.

## Problem Types

A type's URI is `https://api.roobra.com/problems/` followed by its name. The URI identifies the type;
no page is served there yet.

| Type | Status | Raised by |
| --- | --- | --- |
| `validation-failed` | 400 | The global `ValidationPipe`, for any invalid body, query or parameter |
| `email-in-use` | 409 | `POST /v1/auth/register` |
| `username-in-use` | 409 | `POST /v1/auth/register` |
| `invalid-credentials` | 401 | `POST /v1/auth/login` |
| `invalid-token` | 400 | `POST /v1/auth/reset-password`, `POST /v1/auth/verify-email`, `POST /v1/auth/refresh-token` (an unknown, expired or reused refresh token) |
| `incorrect-password` | 400 | `POST /v1/auth/change-password` |

Any other error is `about:blank`:

| Error | Status | `detail` |
| --- | --- | --- |
| An `HttpException` (a missing or invalid token, the rate limit, an unknown route, a guard) | Its own | Its message |
| A client error raised by Express, such as a malformed JSON body | Its own (4xx) | Express's message |
| A Prisma unique constraint violation no service handled (`P2002`) | 409 | None |
| A Prisma record not found no service handled (`P2025`) | 404 | None |
| Anything else | 500 | None: nothing of the error reaches the client. It is logged with its stack and the request id |

## How It Works

- `AllExceptionsFilter` is registered as `APP_FILTER` in `AppModule`, so it catches every error, and
  the e2e specs, which import `AppModule`, test it too.
- A service raises a typed problem with `throw new ProblemException('email-in-use')`, and an
  optional `detail` for the occurrence. The status and the title come from `PROBLEM_TYPES` in
  `src/shared/types/problem.type.ts`.
- The global `ValidationPipe` builds its error with `validationProblemFactory`
  (`src/common/utils/validation-problem/validation-problem.ts`), set as its `exceptionFactory` in `configureApp`.

To add a type, add an entry to `PROBLEM_TYPES` and to the table above. Give a type to an error only
when a client must react to it differently from the other errors with the same status.

## Decisions

- [Answer errors as RFC 9457 problem details](https://github.com/kelthon/roobra-docs/blob/main/adr/2026-10-13-answer-errors-as-rfc-9457-problem-details.md)
