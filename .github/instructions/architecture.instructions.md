---
name: 'System Architecture'
description: 'Where this repository sits in the Roobra ecosystem, its folder structure, and where the architecture is documented.'
applyTo: '**'
---

# System Architecture

This file is a short map. The architecture itself is documented in two places, and this file
deliberately does not repeat either one, so it cannot drift from them.

## Where To Read About The Architecture

| You want to know | Read |
| --- | --- |
| How the ecosystem fits together (components, repositories, flows between services) | [`roobra-docs/architecture/`](https://github.com/kelthon/roobra-docs/tree/main/architecture), starting with its `index.md`, the overview. Each component there is marked built or planned |
| Business rules, personas, glossary | [`roobra-docs/business/`](https://github.com/kelthon/roobra-docs/tree/main/business) |
| How this API works today (auth, notifications, Prisma, Docker) | [`docs/reference/`](../../docs/reference/) |
| Why this API is built the way it is | [`docs/adr/`](../../docs/adr/) |
| How to run, test, configure and deploy it | [`docs/guides/`](../../docs/guides/) |

`roobra-docs` may be checked out as a sibling folder (`../roobra-docs`), but do not assume that path
exists; it depends on the workspace.

## This Repository

The **Backend API** of the Roobra platform: NestJS, Prisma and PostgreSQL, run with Docker Compose.
Web app, dashboard and mobile app are separate projects. Redis, BullMQ and a background worker are
planned and **not implemented**: check `package.json` and `docs/reference/` before assuming a
capability exists.

## Folder And Module Structure

- `src/`: application source code.
  - `common/`: providers, decorators, DTOs and utilities shared across modules (`CommonModule`).
  - `config/`: one config factory per concern (`app`, `database`, `jwt`, `mail`, `throttler`, and the
    password reset and email verification token settings).
  - `modules/`: feature modules. Today: `auth`, `database` (the Prisma service) and `notifications`
    (transactional email).
  - `shared/`: interfaces and types that are not NestJS modules.
  - Unit tests are co-located with the source as `*.spec.ts`.
- `test/`: end-to-end tests (`*.e2e-spec.ts`), with Prisma stubbed.
- `prisma/`: schema (split by domain in `prisma/models/`), migrations and seeds.
- `docs/`: this repository's own documentation, see the table above.

## Architectural Principles

- Modular, loosely coupled components with well-defined interfaces.
- SOLID and DRY.
- Centralized authentication and authorization.
- A decision that changes a contract other repositories rely on is recorded as an ADR in
  `roobra-docs`, not only here.
