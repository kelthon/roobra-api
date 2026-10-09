# AI Agent Instructions

The entry point for any AI agent working in this repository (Claude Code, GitHub Copilot, Gemini CLI
or any other). It is short on purpose: the rules live in the documentation, and this file tells you
where, plus the few facts about this repository that are easy to get wrong.

## Before Any Change

1. **Code:** follow `roobra-docs`'s
   [coding](https://github.com/kelthon/roobra-docs/blob/main/guidelines/coding.md),
   [testing](https://github.com/kelthon/roobra-docs/blob/main/guidelines/testing.md) and
   [git](https://github.com/kelthon/roobra-docs/blob/main/guidelines/git.md) guidelines.
2. **Documentation:** before creating, moving, splitting or deleting a document, or writing an ADR,
   read [`roobra-docs`'s `meta/how-to-document.md`](https://github.com/kelthon/roobra-docs/blob/main/meta/how-to-document.md).
   It is the normative guide for documentation in every Roobra repository.
3. When a rule does not cover your case, ask instead of inventing one.

`roobra-docs` may be checked out as a sibling folder (`../roobra-docs`); do not assume it is.

## This Repository

The backend API of the Roobra platform: NestJS 12, Prisma 7 and PostgreSQL, run with Docker Compose.
Redis, BullMQ and a background worker are planned, not implemented: check `package.json` and
`docs/reference/` before assuming a capability exists.

| You want to know | Read |
| --- | --- |
| How the ecosystem fits together, business rules, personas | [`roobra-docs`](https://github.com/kelthon/roobra-docs): `architecture/`, `business/` |
| How this API works today | [`docs/reference/`](docs/reference/) |
| Why it is built this way | [`docs/adr/`](docs/adr/) |
| How to configure, run, test and deploy it | [`docs/guides/`](docs/guides/) |

Source layout: `src/common/` (shared providers, decorators, DTOs, utilities), `src/config/` (one
config factory per concern), `src/modules/` (feature modules), `src/shared/` (types that are not
modules), unit specs next to the code as `*.spec.ts`, e2e specs in `test/`, and the Prisma schema
split by domain in `prisma/models/`.

## Rules That Are Easy To Miss

- **ES modules.** Local imports end in `.js`, even from a `.ts` file
  (`import { AppModule } from 'src/app.module.js'`), and code that needs its own folder uses
  `import.meta.dirname`, since `__dirname` does not exist.
- **Tests run on Vitest** with globals: `vi` replaces `jest`, and types such as `Mock` are imported
  from `vitest`.
- **A new environment variable** goes into `src/common/schemas/env.schema.ts`, `.env.example`, the
  `env` block of `vitest.config.e2e.ts` and
  [how to configure the environment](docs/guides/how-to-configure-environment.md).
- **Doc comments:** a `@param` about one field of a DTO names it as `dto.field`
  (`@param registerDto.email`).
- Write every document, comment and commit message in English, and check every fact against the code.
- Keep every branch linear: rebase, never merge one branch into another, and never push to `main`.

## Checks

Run all of them before opening or updating a pull request:

```bash
npx prisma generate
npm run typecheck
npm run lint
npm run build
npm test
npm run test:e2e
```

## Commits

One commit per logical change, in Conventional Commits form (`feat(auth): ...`, `fix: ...`,
`docs(adr): ...`), in the imperative mood; see
[`roobra-docs`'s git guidelines](https://github.com/kelthon/roobra-docs/blob/main/guidelines/git.md).
