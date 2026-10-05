# Architecture Decision Records

Decisions that shape `roobra-api` and are costly to reverse. An ADR records **what was decided and
why at a point in time**; it is not a description of how the system works today (that belongs in
[reference](../reference/)) and not a procedure (that belongs in [guides](../guides/)).

Decisions that affect more than one repository belong in `roobra-docs`, not here.

## File Naming

`YYYY-MM-DD-<slug>.md`, dated with the day the decision was made. Dates avoid the number
collisions that sequential IDs cause when several pull requests add ADRs at once. Refer to an ADR
by its file name.

When more than one ADR shares a date, insert a two-digit sequence:
`YYYY-MM-DD-NN-<slug>.md`, `NN` starting at `01`. It reflects the order the decisions are recorded
in (not necessarily the order they happened within that day, which usually isn't known), assigned
once and never reordered — adding a ninth decision to a day that already has eight does not
renumber the first eight.

Start from the [ADR template](https://github.com/kelthon/roobra-docs/blob/main/meta/templates/adr.md)
in `roobra-docs`, where every template for every repository is kept.

## Lifecycle

| Status | Meaning | Editable |
| --- | --- | --- |
| `Draft` | Written but not merged into `main`. | Yes |
| `Proposed` | Merged, decision still open. | Yes |
| `Accepted` | Merged and in force. | No, except typo fixes |
| `Rejected` | Merged and explicitly not adopted. | No |
| `Superseded` | Replaced by a newer ADR (`superseded-by` points to it). | No |

To change an accepted decision, write a new ADR with `supersedes: <old file>` and mark the old one
`Superseded`. Never rewrite history in an accepted ADR.

### Draft Until Merge

Every ADR carries two fields while its pull request is open:

- `status: Draft` — always, even when the decision is already in force in the code.
- `intended-status` — what the status becomes on merge (`Accepted`, `Rejected`, `Proposed`).

When the pull request merges into `main`, `status` takes the value of `intended-status` and
`accepted-at` records the merge date. Decisions that were made before they were written down keep
their real decision date in `date`, and the day they were documented goes in `recorded-at`.

## Where Does A Decision Go

| Question | Destination |
| --- | --- |
| Does it record why we chose X at a moment in time? | ADR |
| Does it describe how something works today? | [reference](../reference/) |
| Does someone follow it step by step? | [guides](../guides/) |
| Does another repository need to know? | `roobra-docs` |

## Index

| ADR | Decision | Status → on merge |
| --- | --- | --- |
| [2026-08-28-01-prisma-cli-as-dependency-and-generate-in-docker](./2026-08-28-01-prisma-cli-as-dependency-and-generate-in-docker.md) | Keep The Prisma CLI In Dependencies And Generate The Client In The Docker Deps Stage | `Draft` → `Accepted` |
| [2026-08-28-02-flat-build-output-and-pinned-tsbuildinfo](./2026-08-28-02-flat-build-output-and-pinned-tsbuildinfo.md) | Build To A Flat `dist/` And Pin The Incremental Build Cache Inside It | `Draft` → `Accepted` |
| [2026-08-28-03-three-compose-files-for-dev-and-prod](./2026-08-28-03-three-compose-files-for-dev-and-prod.md) | Split Docker Compose Into A Shared Base, A Dev Override And A Prod Override | `Draft` → `Accepted` |
| [2026-08-28-04-postgres-image-pinned-and-entrypoint-permissions](./2026-08-28-04-postgres-image-pinned-and-entrypoint-permissions.md) | Pin The Postgres Major Version And Let The Image Entrypoint Manage Permissions | `Draft` → `Accepted` |
| [2026-08-28-05-manual-deployment-via-script](./2026-08-28-05-manual-deployment-via-script.md) | Deploy Manually With A Validating Script; Keep CI To Build, Lint And Test | `Draft` → `Accepted` |
| [2026-09-04-01-global-omit-for-credential-hashes](./2026-09-04-01-global-omit-for-credential-hashes.md) | Omit Credential Hashes Globally On The Prisma Client | `Draft` → `Accepted` |
| [2026-09-04-02-environment-based-prisma-query-logging](./2026-09-04-02-environment-based-prisma-query-logging.md) | Log Prisma Queries In Development Only | `Draft` → `Accepted` |
| [2026-09-07-01-refresh-token-rotation-with-reuse-detection](./2026-09-07-01-refresh-token-rotation-with-reuse-detection.md) | Use Short-Lived JWT Access Tokens And Rotating Opaque Refresh Tokens With Reuse Detection | `Draft` → `Accepted` |
| [2026-09-07-02-hash-secrets-by-entropy-argon2-and-sha256](./2026-09-07-02-hash-secrets-by-entropy-argon2-and-sha256.md) | Hash Passwords With Argon2 And Random Tokens With SHA-256 | `Draft` → `Accepted` |
| [2026-09-10-domain-based-prisma-schema-files](./2026-09-10-domain-based-prisma-schema-files.md) | Organize Prisma Models In Four Domain-Based Schema Files | `Draft` → `Accepted` |
| [2026-09-11-01-one-time-opaque-tokens-for-reset-and-verification](./2026-09-11-01-one-time-opaque-tokens-for-reset-and-verification.md) | Use Single-Use Opaque Tokens For Password Reset And Email Verification | `Draft` → `Accepted` |
| [2026-09-11-02-rate-limit-auth-endpoints](./2026-09-11-02-rate-limit-auth-endpoints.md) | Rate Limit The API Globally And Auth Endpoints More Strictly | `Draft` → `Accepted` |
| [2026-09-11-03-use-nestjs-modules-mailer-for-transactional-email](./2026-09-11-03-use-nestjs-modules-mailer-for-transactional-email.md) | Use `@nestjs-modules/mailer` For Transactional Email | `Draft` → `Accepted` |
| [2026-09-11-04-handlebars-as-email-template-engine](./2026-09-11-04-handlebars-as-email-template-engine.md) | Use Plain Handlebars As The Email Template Engine | `Draft` → `Accepted` |
| [2026-09-11-05-send-transactional-email-synchronously](./2026-09-11-05-send-transactional-email-synchronously.md) | Trigger Transactional Email With A Direct, Synchronous Call | `Draft` → `Accepted` |
| [2026-09-11-06-locale-templates-under-locales-folder](./2026-09-11-06-locale-templates-under-locales-folder.md) | Keep Layouts And Partials Shared, And Put Locale-Specific Templates Under `locales/<locale>/` | `Draft` → `Accepted` |
| [2026-09-11-07-user-preferred-lang-column](./2026-09-11-07-user-preferred-lang-column.md) | Store The Email Language In A Nullable `User.preferredLang`, Seeded Once From `Accept-Language` | `Draft` → `Accepted` |
| [2026-09-11-08-email-transport-provider](./2026-09-11-08-email-transport-provider.md) | Choose The Email Transport Provider (Open) | `Draft` → `Proposed` |
| [2026-09-12-marketing-email-templates-db-backed-marketing-only](./2026-09-12-marketing-email-templates-db-backed-marketing-only.md) | Allow Database-Managed Templates For Marketing Email Only | `Draft` → `Accepted` |
| [2026-09-15-how-to-document-app](./2026-09-15-how-to-document-app.md) | Document With A Central Repository And A Small Local Taxonomy | `Draft` → `Accepted` |
