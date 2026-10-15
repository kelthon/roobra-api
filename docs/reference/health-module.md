---
doc-status: draft
---

# Health Module Reference

**Location:** `src/modules/health/` — verified against branch `feat/exception-filter`, 2026-10-13.

One route that tells Docker, a load balancer or an uptime monitor whether the API can serve
requests. Built on `@nestjs/terminus`.

## Endpoint

| Method and path | Response | Purpose |
| --- | --- | --- |
| `GET /health` | 200 when every check passes; 503 when one fails | Reports the database's state |

Unlike every other route, a failed check is not answered as [problem details](./error-responses.md):
`HealthCheckFilter`, applied to the controller, answers Terminus's 503 with Terminus's report, the
format monitors and load balancers read.

The route is public and differs from every other route in two ways:

- **Not versioned.** The controller is `VERSION_NEUTRAL`, so the path is `/health` and
  `/v1/health` answers 404. The probes belong to the infrastructure, which should not change when
  the API gains a new version.
- **Not rate limited.** `@SkipThrottle()` keeps a probe every few seconds from using up the global
  limit (20 requests per 60 seconds) and receiving 429.

`loggerOptionsFactory` (`src/common/factories/logger/logger-options.factory.ts`) tells `pino-http` not to
log a completed request to `/health` (`autoLogging.ignore`), so the probes do not fill the log. A
failed check is still logged, by Terminus's `HealthCheckService`.

## Checks

| Key | Check | Down when |
| --- | --- | --- |
| `database` | `PrismaHealthIndicator.pingCheck` runs `SELECT 1` through `PrismaService` | Postgres does not answer within 1 second |

Only what stops the API from serving requests is checked. Redis is not, because the application
does not use it yet; the mail server is not, because a failing mail provider only breaks sending
email, and a 503 would make Docker restart a container that serves every other route.

## Response

Terminus's format. Database up (200):

```json
{
  "status": "ok",
  "info": { "database": { "status": "up", "responseTime": 1 } },
  "error": {},
  "details": { "database": { "status": "up", "responseTime": 1 } }
}
```

Database down (503):

```json
{
  "status": "error",
  "info": {},
  "error": { "database": { "status": "down", "message": "timeout of 1000ms exceeded", "responseTime": 1001 } },
  "details": { "database": { "status": "down", "message": "timeout of 1000ms exceeded", "responseTime": 1001 } }
}
```

## Docker

The `server` service in `compose.yaml` calls the route with Node's `fetch`, since the alpine image
has no `curl`: every 10 seconds, 5-second timeout, unhealthy after 3 failures. Failures in the
first 60 seconds (`start_period`) do not count, which covers the development container's
`prisma generate` and first compile. See the [Docker setup](./docker-setup.md).

## Structure

`HealthModule` imports `TerminusModule` and `DatabaseModule`, and declares `HealthController`, with
`HealthCheckFilter` (`health-check.filter.ts`) applied to it.
