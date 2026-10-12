---
status: Draft
intended-status: Accepted
date: 2026-10-12
recorded-at: 2026-10-12
source: 'commit a5bb0d5 (feat(log): add pino logger), branch feat/healthcheck'
supersedes:
superseded-by:
---

# Log Structured JSON To Stdout With Pino

## Context

The API logged through Nest's default `ConsoleLogger`: plain text, no request logs and nothing to
tie the lines of one request together. `roobra-docs`'s backlog task 1.3.4 asks for structured
logging and names Winston, with no recorded reason, so that later tasks can build on it: request
and response logging (1.3.2), correlation IDs (1.3.5) and, after the MVP, shipping logs to ELK or
CloudWatch and tracing with OpenTelemetry.

The API runs in Docker, where a container writes to stdout and the platform collects it.

## Decision

Log with pino through `nestjs-pino`, as JSON lines on stdout.

- `loggerOptionsFactory` (`src/common/logger/logger-options.factory.ts`) configures `pino-http`,
  which logs every completed request with its method, URL, headers, body, status and duration.
  `main.ts` creates the app with `bufferLogs: true` and replaces Nest's logger with pino's, so the
  startup logs go through it too.
- Outside production (`app.mode`, from `NODE_ENV`) the level is `debug` and `pino-pretty` prints
  colored text; in production the level is `info` and the output is raw JSON.
- Each request gets an id that every log line of it carries and the response returns in
  `X-Request-Id`. A client's `X-Request-Id` is reused when it is 1 to 128 letters, digits, `_` or
  `-`; any other value, or none, is replaced by a random UUID.
- The `Authorization` and `Cookie` headers, the `Set-Cookie` response header and every body field
  that holds a password or a token (`password`, `confirmPassword`, `currentPassword`,
  `newPassword`, `confirmNewPassword`, `refreshToken`, `resetToken`, `token`) are logged as
  `[Redacted]`.
- Requests to `GET /health` are not logged (`autoLogging.ignore`), since a probe calls it every
  few seconds.
- Shipping logs elsewhere is the platform's job (Docker, a collector), not the application's.

## Alternatives Considered

- **Winston** (`nest-winston`) — named by the backlog, but without a reason. Its strength is
  formatting and sending logs to several destinations from inside the process, which a container
  writing to stdout does not need. It formats on the application's thread, which makes it slower,
  and it does not log requests or assign request ids: 1.3.2 and 1.3.5 would be code to write here.
- **Not logging request bodies** — keeps any field nobody thought to redact out of the logs, but
  leaves out what the client sent, which is often what explains a 400 or a 500.
- **Nest's `ConsoleLogger` in JSON mode** — no extra dependency, but it logs no requests and has no
  request ids either.

## Consequences

- Task 1.3.2 (request logging) comes with `pino-http`, and 1.3.5 (correlation IDs) is its
  `genReqId` option plus the `X-Request-Id` header, not a middleware of its own.
- A new body field that holds a secret is logged in clear text until it is added to the redacted
  list in `logger-options.factory.ts`.
- Any collector that reads JSON from stdout can take the logs, and pino has OpenTelemetry
  instrumentation for the tracing planned after the MVP.
- `pino-pretty` is a development dependency, so the production image does not have it. The image
  sets `NODE_ENV=production`; running it with another `NODE_ENV` fails at startup, because pino
  then looks for `pino-pretty`.
- Writing logs to a file or to several services from the process needs a pino transport, which
  runs in a worker thread, instead of a ready-made option.
