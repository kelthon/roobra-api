# Documentation Index

API-specific documentation for `roobra-api`. For ecosystem-wide and cross-service documentation
(business rules, personas, architecture across services), see the `roobra-docs` repository.

- [docker.md](./docker.md) — Container setup: Dockerfile stages, the three Compose files, and the
  reasoning behind non-obvious choices (Postgres permissions, Prisma client generation, build
  output path).
- [deployment.md](./deployment.md) — How the app is deployed today, what `scripts/deploy.sh` does,
  and what is still missing from the CI/CD pipeline.
