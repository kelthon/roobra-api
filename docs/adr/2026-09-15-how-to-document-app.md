---
status: Draft
intended-status: Accepted
date: 2026-09-15
recorded-at: 2026-09-18
source: RFC "Docs-as-Code" review, 2026-09-18; placeholder file created 2026-09-15
supersedes:
superseded-by:
---

# Document With A Central Repository And A Small Local Taxonomy

## Context

Documentation for the Roobra ecosystem lives in two repositories: `roobra-docs` (global rules,
governance, cross-service architecture) and `roobra-api` (backend). Several `roobra-api` documents
mixed purposes: `docs/docker.md` held reference, decisions and a how-to; `docs/deployment.md` held a
procedure, a decision and troubleshooting. There was no rule for what belongs centrally and what
belongs next to the code, and more repositories are planned (web client, mobile app,
infrastructure, microservices).

## Decision

1. **`roobra-docs` is the single source of truth** for domain and business rules, governance,
   compliance and security policy, cross-service architecture and general onboarding.
2. **Each repository keeps only knowledge tightly coupled to its code**, under `<repo>/docs/`:

   | Folder | Holds | Test |
   | --- | --- | --- |
   | `adr/` | Decisions, immutable once accepted | "Why did we choose X?" |
   | `guides/` | Step-by-step procedures, planned work | "How do I do X?" |
   | `reference/` | Current state: modules, config, local business rules | "How is X today?" |
   | `incidents/` | Post-mortems and RCAs, created when the first incident happens | "What went wrong and what did we learn?" |
   | `superpowers/` | Plans and specs for AI agents. Transient, not part of the doc taxonomy | — |

3. **Tie-breakers.** A guide is planned (someone chooses to do it); troubleshooting that follows a
   failure is a section at the end of the guide until on-call procedures justify a `runbooks/`
   folder. A reference describes a state and changes when the code changes; an ADR records an event
   and does not.
4. **One document, one type.** Mixed content is split into linked files.
5. **ADR files are named `YYYY-MM-DD-<slug>.md`** and carry `status`, `date` and, when relevant,
   `supersedes`/`superseded-by` in frontmatter. See [README](./README.md) for the lifecycle.
6. **A local document never copies a central one.** It links to it. The central document owns the
   business "what and why"; the local one owns the implementation "how".
7. **Migration is incremental** ("split on touch"), one commit per new document. See
   [the migration plan](../superpowers/plans/2026-09-18-docs-restructure-migration.md).

## Alternatives Considered

- **Six local folders (`adr/ business/ guides/ references/ runbooks/ superpowers/`)** — as first
  proposed in the RFC. Rejected: `guides`/`runbooks`/`references` overlap, and `business/` duplicates
  `reference/` for local rules. `runbooks/` and `incidents/` are created only when needed.
- **Sequential ADR numbers (`0001-...`)** — rejected: parallel pull requests collide on the same
  number and force renumbering.
- **Diátaxis folder names (`tutorials/ how-to/ reference/ explanation/`)** — used as a classification
  test, not adopted as folder names. `guides/` maps to how-to, `reference/` to reference, `adr/` and
  the "why" in central docs to explanation. Tutorials belong to onboarding in `roobra-docs`.

## Consequences

- New documents have exactly one obvious destination; reviewers can reject a file that mixes types.
- Cross-repository drift is limited to links rather than copied content. Link checking in CI is
  recommended but not yet set up.
- A new repository copies this structure and creates folders only when it has content for them.
