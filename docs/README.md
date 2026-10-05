# Documentation Index

API-specific documentation for `roobra-api`. For ecosystem-wide and cross-service documentation
(business rules, personas, architecture across services, general onboarding), see the `roobra-docs`
repository. Why the documentation is organized this way:
[adr/2026-09-15-how-to-document-app.md](./adr/2026-09-15-how-to-document-app.md).

## Where Does This Go

| Question | Folder |
| --- | --- |
| Why did we choose X? (a decision at a point in time) | [adr/](./adr/) |
| How do I do X? (steps someone follows) | [guides/](./guides/) |
| How is X today? (modules, configuration, local rules) | [reference/](./reference/) |
| What went wrong and what did we learn? | `incidents/` (created with the first post-mortem) |
| Plan or spec for an AI agent (transient) | [superpowers/](./superpowers/) |
| Does another repository need to know? | `roobra-docs` |

## Templates

This repository keeps no templates. Start every new document from
[`roobra-docs`'s `meta/templates/`](https://github.com/kelthon/roobra-docs/blob/main/meta/templates/README.md),
which also says where each kind of document is saved.

## Decisions

[adr/](./adr/) lists every decision with its status. ADRs stay `Draft` until the restructuring branch
merges into `main`, see [adr/README.md](./adr/README.md).

## Guides

- [how-to-configure-environment.md](./guides/how-to-configure-environment.md) — Create `.env` and set the required values.
- [how-to-run-with-docker.md](./guides/how-to-run-with-docker.md) — Start the stack in development or production mode.
- [how-to-run-tests.md](./guides/how-to-run-tests.md) — Unit and end-to-end tests.
- [how-to-deploy-app.md](./guides/how-to-deploy-app.md) — Production deploy and recovery from a wrong Postgres role.
- [how-to-add-an-email-template.md](./guides/how-to-add-an-email-template.md) — New transactional email or language.

## Reference

- [reference/auth-module.md](./reference/auth-module.md) — Endpoints, guards, tokens.
- [reference/notifications-module.md](./reference/notifications-module.md) — Mailer setup, templates, locales.
- [reference/prisma-setup.md](./reference/prisma-setup.md) — Schema layout, ID types, client options.
- [reference/data-model.md](./reference/data-model.md) — Every table, column and relationship, one diagram per schema file.
- [reference/docker-setup.md](./reference/docker-setup.md) — Dockerfile stages and Compose files.

## Open Proposals

- [prisma-global-config.md](./prisma-global-config.md) — Five Prisma client proposals that are not
  decided yet (BigInt serialization, soft delete, pool tuning, transaction isolation, audit
  logging). Each becomes a `Proposed` ADR when someone works on it, and the file is deleted when
  it is empty.
