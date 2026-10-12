---
doc-status: draft
---

# How To Test Email

## Objective

Send the email verification and password reset emails through the real SMTP path and read them,
first with Mailpit on your machine, then once with a real provider before a release.

## Prerequisites

- The development stack runs (see [how to run with Docker](./how-to-run-with-docker.md)); its
  override starts the `mailpit` service.
- A `.env` file (see [how to configure the environment](./how-to-configure-environment.md)).

## Steps

1. Point the mailer at Mailpit in `.env`. Mailpit accepts any user and password:

   ```sh
   EMAIL_HOST=mailpit   # localhost when the app runs on the host (npm run start:dev)
   EMAIL_PORT=1025
   EMAIL_USER=roobra
   EMAIL_PASSWORD=roobra
   EMAIL_FROM="Roobra" <no-reply@roobra.test>
   ```

2. Apply the change. Compose recreates the `server` container when `.env` changes:

   ```sh
   docker compose up -d
   ```

3. Create an account and keep the `accessToken` from the response:

   ```sh
   curl -s -X POST localhost:3000/auth/register -H 'Content-Type: application/json' \
     -d '{"email":"test@roobra.test","username":"tester","password":"Password123!","confirmPassword":"Password123!"}'
   ```

4. Ask for the verification email, and for a password reset:

   ```sh
   curl -s localhost:3000/auth/verify-email -H "Authorization: Bearer <accessToken>"
   curl -s -X POST localhost:3000/auth/forgot-password -H 'Content-Type: application/json' \
     -d '{"email":"test@roobra.test"}'
   ```

5. Open <http://localhost:8025>. Both emails are there; check the layout and that the button links
   point to `FRONTEND_URL` followed by `/verify-email/<token>` and `/reset-password/<token>`.

6. Before a release, repeat steps 2 to 5 with a real provider: set `EMAIL_HOST`, `EMAIL_PORT`,
   `EMAIL_USER`, `EMAIL_PASSWORD` and `EMAIL_FROM` to its values, use an inbox you can read, and
   check the email in that inbox instead of Mailpit.

## Notes

- `EMAIL_PORT=465` uses implicit TLS; any other port starts in plain text and upgrades with STARTTLS
  when the server offers it (`587` for most providers).
- The provider is not chosen yet
  ([open ADR](https://github.com/kelthon/roobra-docs/blob/main/adr/2026-09-11-02-email-transport-provider.md)).
- Outside `production`, the mailer also opens each email in a browser (`preview`). It does nothing
  inside the container, which has no browser.
- The test account stays in the development database. Delete it with `DELETE /users/me`, or drop the
  data with `docker compose down -v`.
- The unit and e2e suites never send email: `render.spec.ts` renders every template, and
  `test/mail.e2e-spec.ts` stubs the transport.

## Troubleshooting

- **`535 Authentication failed`:** the provider rejected `EMAIL_USER` or `EMAIL_PASSWORD`.
  Ethereal accounts, for example, expire; create new credentials.
