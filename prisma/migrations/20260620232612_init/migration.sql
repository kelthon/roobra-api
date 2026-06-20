-- CreateEnum
CREATE TYPE "user_roles" AS ENUM ('subscriber', 'admin', 'content_manager', 'support_agent', 'staff');

-- CreateEnum
CREATE TYPE "reading_progress_status" AS ENUM ('in_progress', 'completed');

-- CreateEnum
CREATE TYPE "discount_types" AS ENUM ('percent', 'fixed_value');

-- CreateEnum
CREATE TYPE "gateway_status" AS ENUM ('pending', 'waiting', 'generated', 'canceled', 'paid', 'refund', 'partial_refund', 'with_error', 'underpaid', 'overpaid');

-- CreateEnum
CREATE TYPE "payment_methods" AS ENUM ('boleto', 'credit_card', 'debit_card', 'pix');

-- CreateTable
CREATE TABLE "users" (
    "id" CHAR(21) NOT NULL,
    "username" VARCHAR(75) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "photo_url" VARCHAR(255),
    "google_id" VARCHAR(255),
    "hashed_password" VARCHAR(255),
    "email_verified_at" TIMESTAMPTZ,
    "birthdate" DATE,
    "role" "user_roles" NOT NULL DEFAULT 'subscriber',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscribers" (
    "id" BIGSERIAL NOT NULL,
    "access_expiration_date" DATE NOT NULL,
    "renovation_date" DATE NOT NULL,
    "subscription_id" BIGINT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "subscribers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_members" (
    "id" SERIAL NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "staff_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" BIGSERIAL NOT NULL,
    "hashed_token" VARCHAR(255) NOT NULL,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "user_agent" VARCHAR(35) DEFAULT 'unspecified',
    "operating_system" VARCHAR(35) DEFAULT 'unspecified',
    "expires_at" TIMESTAMPTZ NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" BIGSERIAL NOT NULL,
    "hashed_token" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used_at" TIMESTAMPTZ,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medias" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(21) NOT NULL,
    "description" TEXT,
    "cover_image_url" VARCHAR(255),
    "alternative_cover_image_urls" TEXT[],
    "page_sample_image_urls" TEXT[],
    "authors" TEXT[],
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "is_free" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "medias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_volumes" (
    "id" BIGSERIAL NOT NULL,
    "number" SMALLINT,
    "title" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "cover_image_url" VARCHAR(255),
    "authors" TEXT[],
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "is_free" BOOLEAN NOT NULL DEFAULT false,
    "media_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "media_volumes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_chapters" (
    "id" BIGSERIAL NOT NULL,
    "number" SMALLINT,
    "title" VARCHAR(100) NOT NULL,
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "is_free" BOOLEAN NOT NULL DEFAULT false,
    "volume_id" BIGINT NOT NULL,

    CONSTRAINT "media_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_pages" (
    "id" BIGSERIAL NOT NULL,
    "number" SMALLINT NOT NULL,
    "image_url" VARCHAR(255) NOT NULL,
    "has_sensible_content" BOOLEAN NOT NULL DEFAULT false,
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "is_free" BOOLEAN NOT NULL DEFAULT false,
    "chapter_id" BIGINT NOT NULL,

    CONSTRAINT "media_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_genres" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "slug" VARCHAR(50) NOT NULL,

    CONSTRAINT "media_genres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_read_lists" (
    "id" SERIAL NOT NULL,
    "client_id" BIGINT NOT NULL,
    "media_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "user_read_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_history" (
    "id" BIGSERIAL NOT NULL,
    "status" "reading_progress_status" NOT NULL DEFAULT 'in_progress',
    "last_read_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "client_id" BIGINT NOT NULL,
    "page_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "price_annual" DECIMAL(10,2) NOT NULL,
    "access_days" SMALLINT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotions" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "description" VARCHAR(255),
    "discount" DECIMAL(10,2) NOT NULL,
    "discount_type" "discount_types" NOT NULL DEFAULT 'fixed_value',
    "start_date" TIMESTAMPTZ NOT NULL,
    "end_date" TIMESTAMPTZ,
    "max_uses" INTEGER,
    "per_user" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_usages" (
    "id" BIGSERIAL NOT NULL,
    "usedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "client_id" BIGINT NOT NULL,
    "promotion_id" BIGINT NOT NULL,

    CONSTRAINT "promotion_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" BIGSERIAL NOT NULL,
    "payment_gateway" VARCHAR(50) NOT NULL,
    "payment_method" "payment_methods" NOT NULL,
    "status" "gateway_status" NOT NULL DEFAULT 'pending',
    "subtotal" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "client_id" BIGINT NOT NULL,
    "promotion_id" BIGINT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" BIGSERIAL NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "subscription_id" BIGINT NOT NULL,
    "order_id" BIGINT NOT NULL,
    "promotion_id" BIGINT,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_refunds" (
    "id" BIGSERIAL NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT,
    "order_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "entity" TEXT,
    "entity_id" TEXT,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "keys" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(35) NOT NULL,
    "hashed_key" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_media_to_media_genres" (
    "A" BIGINT NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_media_to_media_genres_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_promotion_to_subscription" (
    "A" BIGINT NOT NULL,
    "B" BIGINT NOT NULL,

    CONSTRAINT "_promotion_to_subscription_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscribers_user_id_key" ON "subscribers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_members_user_id_key" ON "staff_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_hashed_token_key" ON "refresh_tokens"("hashed_token");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_hashed_token_key" ON "password_reset_tokens"("hashed_token");

-- CreateIndex
CREATE UNIQUE INDEX "medias_slug_key" ON "medias"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "media_volumes_media_id_number_key" ON "media_volumes"("media_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "media_chapters_volume_id_number_key" ON "media_chapters"("volume_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "media_pages_chapter_id_number_key" ON "media_pages"("chapter_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "media_genres_slug_key" ON "media_genres"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "promotions_code_key" ON "promotions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "promotion_usages_client_id_promotion_id_key" ON "promotion_usages"("client_id", "promotion_id");

-- CreateIndex
CREATE UNIQUE INDEX "keys_hashed_key_key" ON "keys"("hashed_key");

-- CreateIndex
CREATE INDEX "_media_to_media_genres_B_index" ON "_media_to_media_genres"("B");

-- CreateIndex
CREATE INDEX "_promotion_to_subscription_B_index" ON "_promotion_to_subscription"("B");

-- AddForeignKey
ALTER TABLE "subscribers" ADD CONSTRAINT "subscribers_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscribers" ADD CONSTRAINT "subscribers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_members" ADD CONSTRAINT "staff_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_volumes" ADD CONSTRAINT "media_volumes_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "medias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_chapters" ADD CONSTRAINT "media_chapters_volume_id_fkey" FOREIGN KEY ("volume_id") REFERENCES "media_volumes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_pages" ADD CONSTRAINT "media_pages_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "media_chapters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_read_lists" ADD CONSTRAINT "user_read_lists_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "subscribers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_read_lists" ADD CONSTRAINT "user_read_lists_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "medias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_history" ADD CONSTRAINT "user_history_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "subscribers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_history" ADD CONSTRAINT "user_history_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "media_pages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_usages" ADD CONSTRAINT "promotion_usages_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "subscribers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_usages" ADD CONSTRAINT "promotion_usages_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "subscribers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_refunds" ADD CONSTRAINT "order_refunds_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_media_to_media_genres" ADD CONSTRAINT "_media_to_media_genres_A_fkey" FOREIGN KEY ("A") REFERENCES "medias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_media_to_media_genres" ADD CONSTRAINT "_media_to_media_genres_B_fkey" FOREIGN KEY ("B") REFERENCES "media_genres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_promotion_to_subscription" ADD CONSTRAINT "_promotion_to_subscription_A_fkey" FOREIGN KEY ("A") REFERENCES "promotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_promotion_to_subscription" ADD CONSTRAINT "_promotion_to_subscription_B_fkey" FOREIGN KEY ("B") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
