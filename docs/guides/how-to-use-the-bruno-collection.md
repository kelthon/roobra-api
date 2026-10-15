---
doc-status: draft
---

# How To Use The Bruno Collection

## Objective

Call the API from the Bruno collection in `bruno/` instead of typing `curl` commands, one request at a
time or as a whole flow with its checks.

[Bruno](https://www.usebruno.com/) is an open-source API client, like Postman or Insomnia, that keeps
each request as a plain-text file. This collection uses Bruno's YAML format (OpenCollection): the
collection is described by `bruno/opencollection.yml`, each request is a `.yml` file and the
environment is `bruno/environments/Local.yml`. The collection is versioned with the code, so a
changed route and its request change in the same pull request, and nothing is stored in a cloud
account.

## Prerequisites

- The development stack runs, with Mailpit (see [how to run with Docker](./how-to-run-with-docker.md)).
- `.env` points the mailer at Mailpit (see [how to test email](./how-to-test-email.md), step 1).
- A Bruno desktop app that opens YAML (OpenCollection) collections, or Node.js for the command line
  (`npx @usebruno/cli`).

## Steps

1. Open the collection: in the Bruno app, **Open Collection** and pick the repository's `bruno/`
   folder.

2. Select the **Local** environment in the top right corner:

   | Variable | Value | Used for |
   | --- | --- | --- |
   | `baseUrl` | `http://localhost:3000` | The API, without the version: each request adds `/v1` |
   | `mailpitUrl` | `http://localhost:8025` | Mailpit's API, where the requests read the emails the API sends |
   | `password` | `Password123!` | The first password of the account the flow creates |

3. Run the whole flow: right-click the collection and choose **Run**. Each request keeps in runtime
   variables what the next ones need, so the flow covers every auth route without copying a token by
   hand:

   | Request | Does | Keeps |
   | --- | --- | --- |
   | `auth/01 Register` | Creates a new account, `test-<id>@roobra.test` and `tester_<id>`, so every run starts clean | `email`, `username`, `password`, `accessToken`, `refreshToken` |
   | `auth/02 Login` | Signs in with `email` and `password` | `accessToken`, `refreshToken` |
   | `auth/03 List sessions` | `GET /v1/auth/sessions`: at least the register and login sessions | — |
   | `auth/04 Refresh token` | Rotates the refresh token, and checks it changed | `accessToken`, `refreshToken` |
   | `auth/05 Send verification email` | `GET /v1/auth/verify-email` | — |
   | `auth/06 Read verification email (Mailpit)` | Reads Mailpit's latest email, checks it went to `email`, and takes the token from its link | `verificationToken` |
   | `auth/07 Verify email` | `POST /v1/auth/verify-email` with that token | — |
   | `auth/08 Change password` | From `password` to `Changed456!` | `password` (the new one) |
   | `auth/09 Forgot password` | Emails a reset link to `email` | — |
   | `auth/10 Read reset email (Mailpit)` | Takes the reset token from the latest email | `resetToken` |
   | `auth/11 Reset password` | Sets `Reset789!` with the reset token | `password` (the new one) |
   | `auth/12 Login with the reset password` | Signs in with the password the reset set | `accessToken`, `refreshToken` |
   | `auth/13 Logout` | Revokes the current refresh token | — |
   | `auth/14 Logout from every session` | Revokes the account's other sessions | — |
   | `health/00 Health check` | `GET /health` | — |
   | `users/15 Get profile` | `GET /v1/users/me`: the account, with `emailVerifiedAt` set | — |
   | `users/16 Delete account` | `DELETE /v1/users/me` | — |

   The runner takes the folders in alphabetical order and the requests by `seq` inside each one.
   `users` comes after `auth`, so the account is deleted last; the access token still works after
   the logouts, because a JWT stays valid until it expires.

4. Or run one request: select it and press `Ctrl+Enter`. A request reads the variables the earlier
   ones kept in this session, so run **Register** first; after it, any request can be run on its own,
   in any order that makes sense (an email is read from Mailpit after the request that sends it).

5. Or run it from the command line, from the repository root:

   ```sh
   cd bruno
   npx @usebruno/cli run --env Local
   ```

## Notes

- `register`, `login`, `refresh-token`, `forgot-password` and `reset-password` accept 5 requests per
  minute; the flow calls `login` twice, so running it more than twice a minute answers `429`.
- The Mailpit requests read the **latest** email. Something else sending email between a request that
  sends one and the request that reads it makes the read fail its check that the email went to
  `email`.
- To add a request, copy one of the `.yml` files and change `info` (name and `seq`, the run order),
  `http` (method, URL as `{{baseUrl}}/v1/...`, body, auth) and `runtime.scripts` (a
  `before-request` script to set a value first, an `after-response` script to keep a value with
  `bru.setVar`, a `tests` script to check the response).
- Never put a real secret in a request or environment file: the files are committed. A secret for a future
  environment goes in a `bruno/.env` file, added to `.gitignore`, and is read with
  `{{process.env.NAME}}`.
- A new or changed route gets its request in the same pull request. `bruno/` is excluded from the
  Docker build context.
