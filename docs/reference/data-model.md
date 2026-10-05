---
doc-status: draft
impl-status: partial
---

# Data Model Reference

**Location:** `prisma/models/*.prisma` — generated from the schema at commit `57dbfa6` of branch
`docs/restructure-documentation`, 2026-09-30.

The detailed entity-relationship model of `roobra-api`'s PostgreSQL database: every table with its
columns, keys and relationships, one diagram per schema file. The ecosystem-level view, with the
container that owns each entity and the decisions behind the model, is `roobra-docs`'s
[domain model](https://github.com/kelthon/roobra-docs/blob/main/architecture/data/domain-model.md).
How the schema files, ID types and client options are set up is in
[prisma-setup.md](./prisma-setup.md).

Only four tables are read or written by application code today: `users`, `refresh_tokens`,
`password_reset_tokens` and `email_verification_token`. Every other table is filled only by the
development seed (`prisma/seeds/`).

## How To Read The Diagrams

- Entity names are the model names in upper snake case; the table name is in the table under each
  diagram. Column names are the database names (`@map`), with the PostgreSQL type (`@db`, or
  Prisma's default type when there is none).
- `PK`, `FK` and `UK` mark primary, foreign and unique keys; `nullable` marks optional columns.
  Composite unique keys are listed under each diagram.
- Relationship labels are the Prisma relation field names. An entity from another schema file
  appears without columns.

## Auth & Identity

`auth.prisma`: Identity, sessions, one-time tokens, the staff profile and a `keys` table whose purpose is
not documented yet.

```mermaid
erDiagram
    accTitle: Auth & Identity entities
    accDescr: Users with their sessions, one-time tokens and staff profile, and the stand-alone keys table.

    USER {
        char id PK
        varchar username UK
        varchar email UK
        varchar photo_url "nullable"
        varchar google_id UK "nullable"
        varchar hashed_password "nullable"
        timestamptz email_verified_at "nullable"
        date birthdate "nullable"
        varchar preferred_lang "nullable"
        UserRole role
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at "nullable"
    }
    REFRESH_TOKEN {
        bigint id PK
        varchar hashed_token UK
        boolean is_revoked
        varchar user_agent "nullable"
        varchar operating_system "nullable"
        timestamptz expires_at
        text user_id FK
        timestamptz created_at
    }
    PASSWORD_RESET_TOKEN {
        bigint id PK
        varchar hashed_token UK
        timestamptz expires_at
        timestamptz used_at "nullable"
        text user_id FK
        timestamptz created_at
    }
    EMAIL_VERIFICATION_TOKEN {
        bigint id PK
        varchar hashed_token UK
        timestamptz expires_at
        timestamptz used_at "nullable"
        text user_id FK
        timestamptz created_at
    }
    KEY {
        integer id PK
        varchar name
        varchar hashed_key UK
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at "nullable"
    }
    STAFF_MEMBER {
        integer id PK
        boolean is_active
        text user_id FK,UK
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at "nullable"
    }
    USER ||--o{ AUDIT_LOG : "logs"
    USER ||--o{ REFRESH_TOKEN : "refreshTokens"
    USER ||--o{ PASSWORD_RESET_TOKEN : "passwordResetTokens"
    USER ||--o{ EMAIL_VERIFICATION_TOKEN : "emailVerificationToknes"
    USER ||--o| STAFF_MEMBER : "staffMember"
    USER ||--o| SUBSCRIBER : "subscriber"
```

| Entity | Table |
| --- | --- |
| `USER` | `users` |
| `REFRESH_TOKEN` | `refresh_tokens` |
| `PASSWORD_RESET_TOKEN` | `password_reset_tokens` |
| `EMAIL_VERIFICATION_TOKEN` | `email_verification_token` |
| `KEY` | `keys` |
| `STAFF_MEMBER` | `staff_members` |

## Content & Discovery

`content.prisma`: The catalog hierarchy (media, volumes, chapters, pages), genres, and each subscriber's reading progress and read list.

```mermaid
erDiagram
    accTitle: Content & Discovery entities
    accDescr: Media contain volumes, chapters and pages; genres classify media; subscribers keep reading history and read lists.

    MEDIA {
        bigint id PK
        varchar name
        varchar slug UK
        text description "nullable"
        varchar cover_image_url "nullable"
        text_array alternative_cover_image_urls
        text_array page_sample_image_urls
        text_array authors
        boolean is_private
        boolean is_free
        tsvector searchable_text "nullable"
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at "nullable"
    }
    MEDIA_VOLUME {
        bigint id PK
        smallint number "nullable"
        varchar title
        text description "nullable"
        varchar cover_image_url "nullable"
        text_array authors
        boolean is_private
        boolean is_free
        bigint media_id FK
        tsvector searchable_text "nullable"
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at "nullable"
    }
    MEDIA_CHAPTER {
        bigint id PK
        smallint number "nullable"
        varchar title
        boolean is_private
        boolean is_free
        bigint volume_id FK
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at "nullable"
    }
    MEDIA_PAGE {
        bigint id PK
        smallint number
        varchar image_url
        boolean has_sensitive_content
        boolean is_private
        boolean is_free
        bigint chapter_id FK
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at "nullable"
    }
    MEDIA_GENRE {
        integer id PK
        varchar name
        varchar slug UK
    }
    USER_HISTORY {
        bigint id PK
        ReadingProgressStatus status
        timestamptz last_read_at
        bigint subscriber_id FK
        bigint page_id FK
        timestamptz created_at
        timestamptz updated_at
    }
    USER_READ_LIST {
        bigint id PK
        bigint subscriber_id FK
        bigint media_id FK
        timestamptz created_at
        timestamptz deleted_at "nullable"
    }
    MEDIA }o--o{ MEDIA_GENRE : "many-to-many"
    MEDIA ||--o{ MEDIA_VOLUME : "volumes"
    MEDIA_VOLUME ||--o{ MEDIA_CHAPTER : "chapters"
    MEDIA_CHAPTER ||--o{ MEDIA_PAGE : "mediaPages"
    SUBSCRIBER ||--o{ USER_HISTORY : "viewHistory"
    MEDIA_PAGE ||--o{ USER_HISTORY : "userHistories"
    SUBSCRIBER ||--o{ USER_READ_LIST : "userReadLists"
    MEDIA ||--o{ USER_READ_LIST : "userReadLists"
```

| Entity | Table |
| --- | --- |
| `MEDIA` | `medias` |
| `MEDIA_VOLUME` | `media_volumes` |
| `MEDIA_CHAPTER` | `media_chapters` |
| `MEDIA_PAGE` | `media_pages` |
| `MEDIA_GENRE` | `media_genres` |
| `USER_HISTORY` | `user_histories` |
| `USER_READ_LIST` | `user_read_lists` |

Composite unique keys: `media_volumes`: (`media_id`, `number`); `media_chapters`: (`volume_id`, `number`); `media_pages`: (`chapter_id`, `number`); `user_read_lists`: (`subscriber_id`, `media_id`).

## Subscriptions & Payments

`commerce.prisma`: Plans, the subscriber profile, orders, refunds and promotions.

```mermaid
erDiagram
    accTitle: Subscriptions & Payments entities
    accDescr: Subscribers are on a plan, place orders with items and refunds, and use promotions.

    SUBSCRIPTION {
        bigint id PK
        varchar name
        decimal price
        decimal price_annual
        smallint access_days
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at "nullable"
    }
    SUBSCRIBER {
        bigint id PK
        date access_expiration_date
        date renovation_date
        bigint subscription_id FK
        text user_id FK,UK
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at "nullable"
    }
    PROMOTION {
        bigint id PK
        varchar code UK
        varchar description "nullable"
        decimal discount
        DiscountType discount_type
        timestamptz start_date
        timestamptz end_date "nullable"
        integer max_uses "nullable"
        boolean per_user
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at "nullable"
    }
    PROMOTION_USAGE {
        bigint id PK
        timestamptz used_at
        bigint subscriber_id FK
        bigint promotion_id FK
    }
    ORDER {
        bigint id PK
        varchar order_external_id UK
        varchar payment_gateway
        PaymentMethod payment_method
        GatewayStatus status
        decimal subtotal
        decimal total
        bigint subscriber_id FK
        bigint promotion_id FK "nullable"
        timestamptz created_at
        timestamptz updated_at
    }
    ORDER_ITEM {
        bigint id PK
        decimal subtotal
        decimal total
        bigint subscription_id FK
        bigint order_id FK
        bigint promotion_id FK "nullable"
    }
    ORDER_REFUND {
        bigint id PK
        decimal amount
        text reason "nullable"
        bigint order_id FK
        timestamptz created_at
    }
    SUBSCRIPTION }o--o{ PROMOTION : "many-to-many"
    SUBSCRIPTION ||--o{ SUBSCRIBER : "subscribers"
    USER ||--o| SUBSCRIBER : "subscriber"
    SUBSCRIBER ||--o{ PROMOTION_USAGE : "promotionUsages"
    PROMOTION ||--o{ PROMOTION_USAGE : "promotionUsages"
    SUBSCRIBER ||--o{ ORDER : "orders"
    PROMOTION |o--o{ ORDER : "orders"
    SUBSCRIPTION ||--o{ ORDER_ITEM : "orderItems"
    ORDER ||--o{ ORDER_ITEM : "orderItems"
    PROMOTION |o--o{ ORDER_ITEM : "orderItems"
    ORDER ||--o{ ORDER_REFUND : "orderRefunds"
    SUBSCRIBER ||--o{ USER_HISTORY : "viewHistory"
    SUBSCRIBER ||--o{ USER_READ_LIST : "userReadLists"
```

| Entity | Table |
| --- | --- |
| `SUBSCRIPTION` | `subscriptions` |
| `SUBSCRIBER` | `subscribers` |
| `PROMOTION` | `promotions` |
| `PROMOTION_USAGE` | `promotion_usages` |
| `ORDER` | `orders` |
| `ORDER_ITEM` | `order_items` |
| `ORDER_REFUND` | `order_refunds` |

Composite unique keys: `promotion_usages`: (`subscriber_id`, `promotion_id`).

## Audit & Security

`audit.prisma`: The audit log.

```mermaid
erDiagram
    accTitle: Audit & Security entities
    accDescr: Each audit log entry belongs to the user who acted.

    AUDIT_LOG {
        bigint id PK
        varchar action
        jsonb metadata
        varchar entity "nullable"
        varchar entity_id "nullable"
        text user_id FK
        timestamptz created_at
    }
    USER ||--o{ AUDIT_LOG : "logs"
```

| Entity | Table |
| --- | --- |
| `AUDIT_LOG` | `audit_logs` |

## Enums

| Enum | Schema file | Values |
| --- | --- | --- |
| `UserRole` | `auth.prisma` | `SUBSCRIBER`, `ADMIN`, `CONTENT_MANAGER`, `SUPPORT_AGENT`, `STAFF` |
| `DiscountType` | `commerce.prisma` | `PERCENT`, `FIXED_VALUE` |
| `GatewayStatus` | `commerce.prisma` | `PENDING`, `WAITING`, `GENERATED`, `CANCELED`, `PAID`, `REFUND`, `PARTIAL_REFUND`, `WITH_ERROR`, `UNDERPAID`, `OVERPAID` |
| `PaymentMethod` | `commerce.prisma` | `BOLETO`, `CREDIT_CARD`, `DEBIT_CARD`, `PIX` |
| `ReadingProgressStatus` | `content.prisma` | `IN_PROGRESS`, `COMPLETED` |

`STAFF` in `UserRole` is deprecated and not a role; see
[the identity and roles ADR](https://github.com/kelthon/roobra-docs/blob/main/adr/2026-09-30-01-separate-identity-from-profiles-and-define-four-roles.md).

## Notes

- `medias` and `media_volumes` have a `searchable_text` `tsvector` column with a GIN index, and
  `users` has trigram GIN indexes on `username` and `email`.
- The `email_verification_token` table name is singular, unlike every other table, and the relation
  field on `User` is spelled `emailVerificationToknes`. Both are as in the schema.
- Foreign keys to `users.id` are `text` while `users.id` is `char(21)`: the foreign key columns
  have no `@db` attribute.
- These diagrams were generated once from the schema; until a generator is committed, a schema
  change updates them by hand in the same pull request.
