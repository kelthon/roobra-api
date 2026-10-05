---
status: Draft
intended-status: Accepted
date: 2026-09-10
recorded-at: 2026-09-18
source: commits 3d2bd2f and 4b9a23d; prisma/models/; prisma.config.ts
supersedes:
superseded-by:
---

# Organize Prisma Models In Four Domain-Based Schema Files

## Context

`prisma/models/` held 20 one-model files (425 lines in total, several under 15 lines each) plus a
misspelled file name (`passsword-reset-token.model.prisma`). Prisma reads every file in the folder
as one schema, so the split carried no technical meaning.

## Decision

Models are grouped into four files that mirror the product's system boundaries in
`roobra-docs` `management/roadmaps/index.md` (its milestones: auth, content, subscriptions and payments,
notifications, audit):

| File | Models |
| --- | --- |
| `auth.prisma` | User, RefreshToken, PasswordResetToken, EmailVerificationToken, Key, StaffMember |
| `content.prisma` | Media, MediaVolume, MediaChapter, MediaPage, MediaGenre, UserHistory, UserReadList |
| `commerce.prisma` | Subscription, Subscriber, Promotion, PromotionUsage, Order, OrderItem, OrderRefund |
| `audit.prisma` | AuditLog |

`schema.prisma` holds only the generator and datasource. Enums stay next to the single model that
owns them; none is shared. `prisma.config.ts` points at the folder (`schema: 'prisma/models'`).

## Alternatives Considered

- **Keep one file per model** — rejected for the reasons in Context.

## Consequences

- New models go into the file of the domain they belong to; a new domain gets a new file.
- The reorganization changed no model, field or relation (verified at the time with `prisma validate`
  and a migrate-diff with no drift).

## Implementation Status

The table lists the files as they are on this branch. `EmailVerificationToken` was added to
`auth.prisma` and `OrderRefundItem` was dropped from `commerce.prisma` after the original commit.
