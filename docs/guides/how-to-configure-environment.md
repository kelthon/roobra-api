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

   - App inside the Compose `server` container: use the service name `db` as the host.
   - App on the host (`npm run start:dev`): use `localhost` and the published port
     (`DATABASE_PORT`, default `5432`).

3. Set the secrets the app refuses to start without. These are read with `getOrThrow` and have no
   default:

   | Variable | Used for |
   | --- | --- |
   | `JWT_SECRET` | Signing and verifying access tokens |
   | `EMAIL_USER`, `EMAIL_PASSWORD` | SMTP credentials for the mailer |

4. Set the values that have defaults if you need something else:

   | Variable | Default | Used for |
   | --- | --- | --- |
   | `EMAIL_HOST`, `EMAIL_PORT` | `localhost`, `587` | SMTP server; port `465` enables implicit TLS |
   | `EMAIL_FROM` | `"Roobra" <no-reply@roobra.com>` | Sender address |
   | `FRONTEND_URL` | `http://localhost:5173` | Base URL of links sent in emails |
   | `PORT` | `3000` | Published port in Compose |

5. Start the app (see [how to run with Docker](./how-to-run-with-docker.md)).

## Notes

- The app loads `.env.development` first and `.env` second; a variable defined in the first wins.
- Compose requires `.env` (`env_file: .env`). Without it, `docker compose up` fails.
- `.env` is gitignored. On the production server it is created and kept up to date by hand, see
  [how to deploy](./how-to-deploy-app.md).
- The remaining keys in `.env.example` (Redis, WhatsApp, payment gateway, analytics, bucket storage)
  are provisioned for planned features and are not read by the code on this branch.

## Troubleshooting

- **The app exits at startup with a configuration error mentioning `jwt.secret` or `mail.*`:** the
  variable in step 3 is missing from `.env`.
- **`FATAL: role "..." does not exist` from `db`:** see the troubleshooting section of
  [how to deploy](./how-to-deploy-app.md).
