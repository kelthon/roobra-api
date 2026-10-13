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

2. Select the **Local** environment in the top right corner. It holds the variables every request
   uses:

   | Variable | Value | Used for |
   | --- | --- | --- |
   | `baseUrl` | `http://localhost:3000` | The API, without the version: each request adds `/v1` |
   | `mailpitUrl` | `http://localhost:8025` | Mailpit's API |
   | `email`, `username`, `password` | A test account | The account the flow creates |

3. Run one request: select it and press `Ctrl+Enter`. Run **Register** first: it stores the
   response's `accessToken` in the `accessToken` variable, which the requests that need a signed-in
   user send as their bearer token.

4. Or run the whole flow: right-click the collection and choose **Run**. The requests run in this
   order, each with its checks:

   | Request | Does | Checks |
   | --- | --- | --- |
   | `health/00 Health check` | `GET /health` | 200 and the database up |
   | `auth/01 Register` | `POST /v1/auth/register`, keeps the access token | 201 and an access token |
   | `auth/02 Send verification email` | `GET /v1/auth/verify-email` | — |
   | `auth/03 Forgot password` | `POST /v1/auth/forgot-password` | — |
   | `mailpit/04 List emails` | Reads Mailpit's inbox | Both emails reached the account's address |
   | `users/05 Delete account` | `DELETE /v1/users/me` | — |

5. Or run it from the command line, from the repository root:

   ```sh
   cd bruno
   npx @usebruno/cli run --env Local
   ```

## Notes

- A deleted account keeps its email and username
  ([issue 17](https://github.com/kelthon/roobra-api/issues/17)), so a second run fails at
  **Register** with a 409 `email-in-use` problem. Change `email` and `username` in the environment, or
  override them for one run from the command line:

  ```sh
  npx @usebruno/cli run --env Local --env-var email=test2@roobra.test --env-var username=tester2
  ```

- `register` and `forgot-password` accept 5 requests per minute; running the flow more often than
  that answers `429`.
- To add a request, copy one of the `.yml` files and change `info` (name and `seq`, the run order),
  `http` (method, URL as `{{baseUrl}}/v1/...`, body, auth) and `runtime.scripts` (an
  `after-response` script to keep a value, a `tests` script to check the response).
- Never put a real secret in a request or environment file: the files are committed. A secret for a future
  environment goes in a `bruno/.env` file, added to `.gitignore`, and is read with
  `{{process.env.NAME}}`.
- A new or changed route gets its request in the same pull request. `bruno/` is excluded from the
  Docker build context.
