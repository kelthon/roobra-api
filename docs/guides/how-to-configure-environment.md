---
doc-status: draft
---

# How To Configure The Environment

## Objective

Create the environment file the API, Docker Compose and the deploy scripts read, with every value the
app needs to start.

## Prerequisites

- A checkout of `roobra-api`.

## Steps

1. Copy the template:

   ```sh
   cp .env.example .env
   ```

2. Set the database values. `DATABASE_USER`, `DATABASE_PASSWORD` and `DATABASE_NAME` provision
   Postgres itself (Compose maps them to `POSTGRES_USER`, `POSTGRES_PASSWORD` and `POSTGRES_DB`).
   `DATABASE_URL` is what the app and `prisma.config.ts` connect with, so it must agree with them.

   - App inside the Compose `server` container: use the service name `postgres` as the host.
   - App on the host (`npm run start:dev`): use `localhost` and the published port
     (`DATABASE_PORT`, default `5432`).

3. Set the required values. The app validates the environment at startup against
   `src/common/schemas/env.schema.ts` and refuses to start if any of these is missing, blank or
   malformed:

   | Variable | Format | Used for |
   | --- | --- | --- |
   | `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_HOST`, `DATABASE_NAME` | Non-blank | Provisioning Postgres, see step 2 |
   | `DATABASE_URL` | `postgres://` or `postgresql://` URL | The app's and Prisma's connection |
   | `JWT_SECRET` | Base64, at least 44 characters (`openssl rand -base64 32`) | Signing and verifying access tokens |
   | `COOKIE_SECRET` | Base64, at least 44 characters (`openssl rand -base64 32`) | Validated only; not read by the code yet |
   | `REDIS_URL` | `redis://` or `rediss://` URL | Validated only; not read by the code yet |
   | `REDIS_PASSWORD` | Non-blank | The Compose `redis` service's password; the `server` waits for Redis to be healthy |
   | `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASSWORD` | Non-blank | SMTP server and credentials for the mailer |
   | `EMAIL_FROM` | An address, bare (`no-reply@roobra.com`) or with a display name (`"Roobra" <no-reply@roobra.com>`) | Sender address |
   | `FRONTEND_URL` | `http://` or `https://` URL | Base URL of links sent in emails |

4. Set the values that have defaults if you need something else. A blank entry (`KEY=`) is not the
   same as a missing one: a blank port fails validation, so delete the line or give it a value.

   | Variable | Default | Used for |
   | --- | --- | --- |
   | `NODE_ENV` | `development` | `development`, `test` or `production`; `production` stops logging Prisma queries |
   | `PORT` | `3000` | Published port in Compose; must be between `1024` and `49151` |
   | `DATABASE_PORT` | `5432` | Postgres port published to the host in development |
   | `EMAIL_PORT` | `587` | SMTP port; `465` enables implicit TLS |
   | `REDIS_PORT` | `6379` | Redis port published to the host in development; not validated by the app |
   | `HOST_UID`, `HOST_GID` | `1000`, `1000` | User and group the development container runs as (`id -u`, `id -g`); not validated by the app |

5. Start the app (see [how to run with Docker](./how-to-run-with-docker.md)).

## Notes

- The app loads `.env.development` first and `.env` second; a variable defined in the first wins.
- Compose requires `.env` (`env_file: .env`). Without it, `docker compose up` fails.
- `.env` is gitignored. On the production server it is created and kept up to date by hand, see
  [how to deploy](./how-to-deploy-app.md).
- The remaining keys in `.env.example` (WhatsApp, payment gateway, analytics, bucket storage) are
  provisioned for planned features; the app neither validates nor reads them.

## Troubleshooting

- **The app exits at startup with `Config validation error`:** the message lists each invalid
  variable and why, for example `JWT_SECRET: Invalid input: expected string, received undefined` or
  `EMAIL_PORT: Too small: expected number to be >=1` for a blank port. Fix them in `.env`, see steps 3
  and 4.
- **`FATAL: role "..." does not exist` from `postgres`:** see the troubleshooting section of
  [how to deploy](./how-to-deploy-app.md).
