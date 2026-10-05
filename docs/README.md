# Documentation Index

API-specific documentation for `roobra-api`. For ecosystem-wide and cross-service documentation
(business rules, personas, architecture across services), see the `roobra-docs` repository.

- [docker.md](./docker.md) — Container setup: Dockerfile stages, the three Compose files, and the
  reasoning behind non-obvious choices (Postgres permissions, Prisma client generation, build
  output path).
- [deployment.md](./deployment.md) — How the app is deployed today, what `scripts/deploy.sh` does,
  and what is still missing from the CI/CD pipeline.
- [prisma-global-config.md](./prisma-global-config.md) — Configuration that should live once,
  globally, on `PrismaService` (credential-hash omission, BigInt serialization, soft delete,
  query logging, connection pooling, transaction isolation, audit logging) instead of being
  repeated or forgotten at each call site.
- [notifications-module-spec.md](./notifications-module-spec.md) — Design decisions for the
  transactional email module (library, template engine, transport, invocation model), what's
  explicitly deferred, and how the current code compares to the plan.
