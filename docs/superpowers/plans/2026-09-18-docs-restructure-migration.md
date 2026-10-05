# Documentation Restructuring Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `roobra-api`'s legacy, mixed-purpose docs into the `adr/`, `guides/`, `reference/` taxonomy and record the decisions that were already made but never written down, without blocking feature work.

**Architecture:** "Split on touch" strangler migration on one long-lived branch (`docs/restructure-documentation`). Legacy files are snapshotted first, then each one is split by content type into new files, one commit per new document so each decision is reviewable on its own. Legacy files become short stubs at cutover and are deleted one release later.

**Tech Stack:** Markdown, git. No code changes.

**Spec:** [docs/adr/2026-09-15-how-to-document-app.md](../../adr/2026-09-15-how-to-document-app.md) (the taxonomy decision itself, derived from the RFC review of 2026-09-18).

## Global Constraints

- Language: English, per `roobra-docs/documentation-formatting-guidelines.md` (Title Case headings, one blank line around headings/lists/code blocks, lowercase-hyphen file names).
- One document = one type. If content needs two types, split it into two files that link to each other.
- ADR file names: `YYYY-MM-DD-<slug>.md`, dated with the day the decision was made (backfilled from git history or the legacy doc), not the day it was written down. The day it was written down goes in `recorded-at`.
- **Every ADR in this branch has `status: Draft`**, including those whose decision is already in force. The decision's real outcome goes in `intended-status`. Statuses are promoted only when this branch merges into `main` (Task 33).
- Facts must be checked against the code on this branch before they are written. Where a rationale was never recorded anywhere, write `Rationale not recorded` instead of inventing one.
- Local docs never copy central knowledge: link to `roobra-docs` by name (business rules, personas, cross-service architecture).
- One commit per new document. Commit type `docs(adr)`, `docs(guides)`, `docs(reference)` or `docs`.
- Do not touch application code, `package.json` or config files.

---

## Legacy Inventory

| Legacy file | Dominant type | Mixed with | Destination | Task |
| --- | --- | --- | --- | --- |
| `docs/docker.md` | reference | 5 decisions, 1 guide | `reference/docker-setup.md`, ADRs 3–6, `guides/how-to-run-with-docker.md` | 3–6, 24, 30 |
| `docs/deployment.md` | guide | 1 decision, troubleshooting, CI notes | `guides/how-to-deploy-app.md`, ADR 7 | 7, 25 |
| `docs/prisma-global-config.md` | proposals | 2 implemented decisions, 5 undecided proposals | ADRs 8–10, `reference/prisma-setup.md`; undecided items stay (Phase 4) | 8–10, 29, 32 |
| `docs/notifications-module-spec.md` | ADR set | reference, status notes, future design | ADRs 15–21, `reference/notifications-module.md`, `guides/how-to-add-an-email-template.md` | 15–21, 26, 28 |
| `docs/superpowers/plans/2026-09-12-notifications-service-migration.md` | executed plan | none | stays; delete after this branch merges (plan already executed on `feat/auth`) | 33 |
| `docs/guides/onboarding-and-technical-functions.md` | empty placeholder | unknown intent | **not migrated**, see Open Questions | — |
| (no doc) auth module | undocumented decisions | none | ADRs 11–14, `reference/auth-module.md` | 11–14, 27 |

## Decisions To Record

| Task | Slug | Date | Evidence | Status target |
| --- | --- | --- | --- | --- |
| 2 | `how-to-document-app` (Task 2; conventions are Task 1, not an ADR) | 2026-09-15 | RFC review, existing placeholder | Accepted |
| 3 | `prisma-cli-as-dependency-and-generate-in-docker` | 2026-08-28 | `docs/docker.md`, `Dockerfile`, `package.json` | Accepted |
| 4 | `flat-build-output-and-pinned-tsbuildinfo` | 2026-08-28 | `docs/docker.md`, `tsconfig.build.json` | Accepted |
| 5 | `three-compose-files-for-dev-and-prod` | 2026-08-28 | `docs/docker.md`, `compose*.yaml` | Accepted |
| 6 | `postgres-image-pinned-and-entrypoint-permissions` | 2026-08-28 | `docs/docker.md`, `compose.yaml` | Accepted |
| 7 | `manual-deployment-via-script` | 2026-08-28 | `docs/deployment.md`, `scripts/`, `.github/workflows/deploy.yml` | Accepted |
| 8 | `global-omit-for-credential-hashes` | 2026-09-04 | `prisma.service.ts`, commit `1126efd` | Accepted |
| 9 | `environment-based-prisma-query-logging` | 2026-09-04 | `prisma.service.ts`, commit `1126efd` | Accepted |
| 10 | `domain-based-prisma-schema-files` | 2026-09-10 | commit `3d2bd2f`, `prisma/models/` | Accepted |
| 11 | `refresh-token-rotation-with-reuse-detection` | 2026-09-07 | `access-token.service.ts`, commits `dab2013`, `2ecd314` | Accepted |
| 12 | `hash-secrets-by-entropy-argon2-and-sha256` | 2026-09-07 | `password-hash.service.ts`, `simple-hash.service.ts`, commit `17cdab9` | Accepted |
| 13 | `one-time-opaque-tokens-for-reset-and-verification` | 2026-09-11 | `auth.service.ts`, token configs, commit `e1b2cfb` | Accepted |
| 14 | `rate-limit-auth-endpoints` | 2026-09-11 | `auth.controller.ts`, `throttler.config.ts`, `main.ts`, commit `4250727` | Accepted |
| 15 | `use-nestjs-modules-mailer-for-transactional-email` | 2026-09-11 | spec §2.1, `app.module.ts` | Accepted |
| 16 | `handlebars-as-email-template-engine` | 2026-09-11 | spec §2.2, `app.module.ts` | Accepted |
| 17 | `send-transactional-email-synchronously` | 2026-09-11 | spec §2.4, `auth.service.ts` | Accepted |
| 18 | `locale-templates-under-locales-folder` | 2026-09-11 | spec §2.5, `app.module.ts`, templates dir | Accepted |
| 19 | `user-preferred-lang-column` | 2026-09-11 | spec §2.6, `auth.prisma`, `locale.util.ts` | Accepted (partially implemented) |
| 20 | `marketing-email-templates-db-backed-marketing-only` | 2026-09-12 | spec §9 | Accepted (not built) |
| 21 | `email-transport-provider` | 2026-09-11 | spec §2.3 | Proposed (open) |

## Procedure A: Write One ADR

Used by Tasks 2–21. Each task names the file, sources and the facts that must be verified.

- [ ] **Step 1:** Copy `docs/adr/_template.md` (Task 1) to the file named in the task.
- [ ] **Step 2:** Fill frontmatter: `status: Draft`, `intended-status`, `date` (decision day), `recorded-at: 2026-09-18`, `source` (legacy doc section, commit or file).
- [ ] **Step 3:** Write Context, Decision, Alternatives Considered, Consequences. Keep each ADR under about 60 lines. Only use alternatives and rationale that exist in the sources; otherwise write `Rationale not recorded`.
- [ ] **Step 4:** Verify each code path and value quoted in the ADR with `grep`/`Read` on this branch. Add an `Implementation Status` line when code diverges from the legacy doc.
- [ ] **Step 5:** Commit only that file: `git commit -m "docs(adr): record <decision>"` with the co-author trailer.

## Phase 1: Foundations

### Task 1: ADR Conventions

**Files:** Create `docs/adr/README.md`, `docs/adr/_template.md`.

- [x] `_template.md` has frontmatter (`status`, `intended-status`, `date`, `recorded-at`, `source`, `supersedes`, `superseded-by`) and sections Context, Decision, Alternatives Considered, Consequences.
- [x] `README.md` documents the lifecycle (`Draft` → `Accepted`/`Rejected` → `Superseded`), the Draft-until-merge rule of this branch, the naming rule, and lists every ADR in a table.
- [x] Commit: `docs(adr): add ADR conventions and template`.

### Task 2: Documentation Architecture ADR

**Files:** Modify (fill) `docs/adr/2026-09-15-how-to-document-app.md`.

- [x] Record: central (`roobra-docs`) vs local split, folders `adr/ guides/ reference/ incidents/ superpowers/`, guides-vs-reference-vs-adr tie-breakers, dated ADR naming, incidents folder created lazily, `superpowers/` outside the doc taxonomy. Alternatives: six-folder RFC layout, sequential ADR numbers, Diátaxis folder names.
- [x] Commit: `docs(adr): record documentation architecture`.

## Phase 2: Decision Records (Procedure A)

### Tasks 3–7: Docker and Deployment

- [x] **Task 3:** `docs/adr/2026-08-28-01-prisma-cli-as-dependency-and-generate-in-docker.md`. Source `docs/docker.md` "Why prisma generate runs inside deps". Verify: `prisma` is in `dependencies` in `package.json`; `Dockerfile` `deps` stage runs `npm ci --omit=dev && npx prisma generate`; `compose.override.yaml` command runs `npx prisma generate`.
- [x] **Task 4:** `docs/adr/2026-08-28-02-flat-build-output-and-pinned-tsbuildinfo.md`. Source `docs/docker.md` (flat output, stray tsbuildinfo). Verify `tsconfig.build.json` `rootDir` and `tsBuildInfoFile`, `start:prod` script, `nest-cli.json` `deleteOutDir`.
- [x] **Task 5:** `docs/adr/2026-08-28-03-three-compose-files-for-dev-and-prod.md`. Verify `compose.yaml`, `compose.override.yaml`, `compose.prod.yaml`, shared `name: roobra-api`, dev `user: node`.
- [x] **Task 6:** `docs/adr/2026-08-28-04-postgres-image-pinned-and-entrypoint-permissions.md`. Verify `image: postgres:18-alpine`, volume mounted at `/var/lib/postgresql`, no `user:` on `db`, `POSTGRES_USER` mapping.
- [x] **Task 7:** `docs/adr/2026-08-28-05-manual-deployment-via-script.md`. Verify `scripts/deploy.sh` checks (`.env`, four variables), `scripts/ensure-db-user.sh` never drops data, workflow `deploy.yml` has no deploy job.

### Tasks 8–9: Prisma Client and Schema

- [x] **Task 8:** `docs/adr/2026-09-04-01-global-omit-for-credential-hashes.md`. Verify `prisma.service.ts` `omit` block and the `omit: { hashedPassword: false }` opt-in in `AuthService.validateUser`. Note that `docs/prisma-global-config.md` §1 still describes this as missing.
- [x] **Task 9:** `docs/adr/2026-09-04-02-environment-based-prisma-query-logging.md`. Verify the `log` option keyed on `config.get('env')`. Note: `env` is not defined by any loaded config (`app.config.ts` exposes `app.mode`), so verify what the branch evaluates to and record it under Implementation Status.
- [x] **Task 10:** `docs/adr/2026-09-10-domain-based-prisma-schema-files.md`. Source commit `3d2bd2f` body. Verify `prisma/models/` files and `prisma.config.ts` `schema: 'prisma/models'`.

### Tasks 11–14: Auth

- [x] **Task 11:** `docs/adr/2026-09-07-01-refresh-token-rotation-with-reuse-detection.md`. Verify `AccessTokenService.refresh` (revoked token presented → `revokeAll`), `jwt.config.ts` lifetimes (access 15 min, refresh 7 days, length 64).
- [x] **Task 12:** `docs/adr/2026-09-07-02-hash-secrets-by-entropy-argon2-and-sha256.md`. Verify `PasswordHashService` (argon2), `SimpleHashService` (sha256 + `timingSafeEqual`), `User.hashedPassword` vs `hashedToken` columns.
- [x] **Task 13:** `docs/adr/2026-09-11-01-one-time-opaque-tokens-for-reset-and-verification.md`. Verify `SimpleTokenService` (hex), `passwordResetToken` 5 min, `emailVerificationToken` 15 min, `usedAt` single-use checks in `AuthService`, `ResetPasswordDto` hex validation.
- [x] **Task 14:** `docs/adr/2026-09-11-02-rate-limit-auth-endpoints.md`. Verify global `ThrottlerGuard` (20/60s), `AUTH_THROTTLE` (5/60s) on register, login, refresh-token, forgot-password, reset-password, and `trust proxy` in `main.ts`.

### Tasks 15–21: Notifications

- [x] **Task 15:** `docs/adr/2026-09-11-03-use-nestjs-modules-mailer-for-transactional-email.md`. Source spec §2.1. Verify pinned versions in `package.json` and `MailerModule.forRootAsync` location (`app.module.ts`, not `notifications.module.ts`).
- [x] **Task 16:** `docs/adr/2026-09-11-04-handlebars-as-email-template-engine.md`. Source spec §2.2. Verify `HandlebarsAdapter` options (`inlineCssEnabled`, `strict: true`).
- [x] **Task 17:** `docs/adr/2026-09-11-05-send-transactional-email-synchronously.md`. Source spec §2.4. Verify `forgotPassword` awaits the send after creating the token; record that `sendVerificationEmail` runs create and send in `Promise.all`.
- [x] **Task 18:** `docs/adr/2026-09-11-06-locale-templates-under-locales-folder.md`. Source spec §2.5. Verify actual layout: `templates/locales/<locale>/`, `i18n.templateDirPattern`, `fallback: true`. The spec says `templates/locale/` and `pt-BR`; the code differs. Record the as-built decision and the divergence.
- [x] **Task 19:** `docs/adr/2026-09-11-07-user-preferred-lang-column.md`. Source spec §2.6. Verify column in `auth.prisma`, migration `20260913195813_...`, `resolveLocale` in `locale.util.ts`. Verify that `AuthService.register` does **not** call it yet and record that under Implementation Status.
- [x] **Task 20:** `docs/adr/2026-09-12-marketing-email-templates-db-backed-marketing-only.md`. Source spec §9.2, §9.3, §9.5, §9.6, §9.8. Verify no `MarketingEmailTemplate` model exists in `prisma/models/`.
- [x] **Task 21:** `docs/adr/2026-09-11-08-email-transport-provider.md`. Source spec §2.3. `status: Draft`, `intended-status: Proposed`: the team explicitly deferred the decision, so the ADR merges as Proposed. Verify the SMTP transport config in `app.module.ts` and `mail.config.ts`.

## Phase 3: Guides and References

Guides use the format Title, Objective, Prerequisites, numbered Steps, Troubleshooting (only when a known failure exists). References describe the current state only and link to ADRs for the why.

### Tasks 22–26: Guides

- [x] **Task 22:** `docs/guides/how-to-configure-environment.md` (replaces the empty typo'd placeholder `how-to-config-enviroment.md`). Verify `.env.example` keys, `ConfigModule` `envFilePath`, and which keys are read with `getOrThrow` and have no default.
- [x] **Task 23:** `docs/guides/how-to-run-tests.md` (fills the empty placeholder). Verify the `test`, `test:cov`, `test:e2e` scripts, the two jest configs and the prisma-client mock mapper.
- [x] **Task 24:** `docs/guides/how-to-run-with-docker.md`. Source `docs/docker.md` "Running each environment".
- [x] **Task 25:** `docs/guides/how-to-deploy-app.md` (fills the empty placeholder). Source `docs/deployment.md`, including the "role does not exist" recovery and the CI section.
- [x] **Task 26:** `docs/guides/how-to-add-an-email-template.md`. Verify against `templates/`, `LocaleType`, `SUPPORTED_LOCALES` and an existing mail service.

### Tasks 27–30: References

- [x] **Task 27:** `docs/reference/auth-module.md`. Endpoint table, route decorators and guards, token lifetimes, `RolesGuard` registered-but-unused note.
- [x] **Task 28:** `docs/reference/notifications-module.md`. As-built architecture, config keys, env vars, per-use-case status, divergences from the original spec.
- [x] **Task 29:** `docs/reference/prisma-setup.md`. Schema file layout, ID types per model, client options as built.
- [x] **Task 30:** `docs/reference/docker-setup.md`. Dockerfile stages, compose files table, env mapping. Use the current `tsx` seed runner, not the `ts-node` the legacy doc mentions.

## Phase 4: Cutover and Promotion

### Task 31: Legacy Stubs and Index

**Files:** Modify `docs/docker.md`, `docs/deployment.md`, `docs/notifications-module-spec.md`, `docs/README.md`.

- [x] Replace `docker.md`, `deployment.md` and `notifications-module-spec.md` with stubs (title, one sentence, links to the new documents).
- [x] Rewrite `docs/README.md` as an index grouped by folder, plus a short "where does this go" table.
- [x] Commit: `docs: replace legacy docs with stubs and update index`.
- [x] (2026-09-23) Repoint the readme, `scripts/ensure-db-user.sh` and `docs/README.md` away from the stubs, then delete the three stubs and the empty `docs/business/` and `docs/references/` folders.

### Task 32: Prisma Proposals Banner

**Files:** Modify `docs/prisma-global-config.md`.

- [x] Add a banner: §1 and §4 are implemented and now live in ADRs 8 and 9; §2, §3, §5, §6 and §7 are still undecided proposals.
- [x] Follow-up, not in this branch: when someone works on one of those sections, split it into a `Proposed` ADR and delete it from this file. When the file is empty, delete it.
- [x] Commit: `docs: mark implemented prisma config sections as migrated`.

### Task 33: Promote Drafts (Runs After Merge Into `main`)

**Files:** Every `docs/adr/2026-*.md` with `status: Draft`.

- [ ] List drafts: `grep -l '^status: Draft' docs/adr/*.md`.
- [ ] For each, set `status:` to its `intended-status` value and add `accepted-at: <merge date>`. The transport ADR (Task 21) becomes `Proposed` instead.
- [ ] Update the status column in `docs/adr/README.md`.
- [ ] Remove `docs/superpowers/plans/2026-09-12-notifications-service-migration.md` (already executed). The three stubs were already removed on 2026-09-23.
- [ ] Commit on a follow-up branch: `docs(adr): promote drafts after merge`.

## Open Questions For Reviewers

1. ~~`docs/guides/onboarding-and-technical-functions.md` is empty.~~ Closed: the placeholder no longer exists, and general engineering onboarding belongs in `roobra-docs`.
2. ~~Task 9: the `env` config key read by `PrismaService` is not defined.~~ Closed: it was a bug, fixed to `app.mode` (commit `3a6e350`).
3. Task 19: `preferredLang` is modeled but not yet populated at registration. **Open**: code follow-up, tracked in `todo.md`.
4. ~~The spec cites `BR-30` for rate limiting.~~ Closed: that rule is "Misuse"; rate limiting gets its own rule in `roobra-docs` (ids were renumbered on 2026-09-23, so the old `BR-30` is now `BR-028`).
5. `docs/incidents/` is not created until the first incident. The stale-Postgres-role episode (now a troubleshooting section of `guides/how-to-deploy-app.md`) could be back-written as the first post-mortem if a date and impact are known. **Open**.

## Self-Review Notes

- Spec coverage: every decision in the legacy docs marked "Decided" maps to a task; undecided proposals are explicitly deferred (Task 32).
- Placeholder scan: none of the tasks defer content; open items are listed under Open Questions.
- Naming consistency: file names in the inventory, decision table and tasks match.

## Execution Notes (2026-09-18)

Tasks 1–32 were executed on `docs/restructure-documentation`. Task 33 runs after the merge into `main`.

### Deviations

- `docs/adr/README.md` got its index in a separate commit, generated from each ADR's frontmatter.
- The draft `MarketingEmailTemplate` schema moved into an appendix of ADR 20, so the notifications
  spec could become a stub without losing it.
- The empty placeholder `guides/how-to-config-enviroment.md` (typo) was replaced by
  `guides/how-to-configure-environment.md`.
- `guides/onboarding-and-technical-functions.md` (empty, untracked) was left untouched, see Open Question 1.
- Empty local folders `docs/business/`, `docs/references/` and `docs/runbooks/` come from the RFC's
  first six-folder layout. They are untracked and unused; delete them unless a use appears.

### Findings From Verifying The Docs Against The Code

(Not fixed here; each needs a code change or a decision.)

1. `PrismaService` reads `config.get('env')`, which no config defines, so queries are logged in
   production (ADR 9).
2. `verify-email.hbs` tells users the link is valid for 48 hours; the token lives 15 minutes
   (`Math.round` of 0.25 hours is falsy). It and `new-device.hbs` also contain stray `[cite: ...]` text.
3. `sendVerificationEmail` creates the token and sends the email in one `Promise.all` (ADR 17).
4. `preferredLang` and `resolveLocale` exist but registration does not use them (ADR 19).
5. `EmailVerificationToken.hashedToken` is not in the global `omit` list (ADR 8).
6. `JwtStrategy.validate` does not reject deleted or blocked users (ADR 11).
7. `forgotPassword` answers "No user found" for unknown emails (ADR 13).
8. The workflow `deploy.yml` does not deploy (ADR 7).

## Execution Notes (2026-09-23)

The cutover is done on this branch; only Task 33 (after the merge into `main`) remains.

- Readme, `docs/README.md` and `scripts/ensure-db-user.sh` no longer link to removed files; the three
  stubs and the empty folders are deleted.
- `notifications-module.md`, the query logging ADR and the omit ADR were brought up to date with the
  fixes below.
- `.github/instructions/architecture.instructions.md` is now a short map to the real docs.
- Eight citations of `roobra-docs/management/mvp-summary.md` (a personal file that is never committed)
  now cite `management/roadmap.md` or `backlog.md`.

### Status Of The Findings Above (2026-09-23)

1, 2 and 5 are fixed (commits `3a6e350`, `c2a4e34`, `3c9fa02`).
3, 4, 6, 7 and 8 are still open code follow-ups, tracked in `todo.md`, which should become issues
before it is deleted.
