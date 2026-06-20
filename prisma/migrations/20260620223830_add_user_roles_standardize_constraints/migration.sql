/*
  Warnings:

  - You are about to drop the column `staffMember_id` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `subscriber_id` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `OrderItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OrderRefund` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserReadList` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_MediaToMediaGenres` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_PromotionToSubscription` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `staff` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `viewers` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "user_roles" AS ENUM ('subscriber', 'admin', 'content_manager', 'support_agent', 'staff');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "gateway_status" ADD VALUE 'underpaid';
ALTER TYPE "gateway_status" ADD VALUE 'overpaid';

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_order_id_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_promotion_id_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_subscription_id_fkey";

-- DropForeignKey
ALTER TABLE "OrderRefund" DROP CONSTRAINT "OrderRefund_order_id_fkey";

-- DropForeignKey
ALTER TABLE "UserReadList" DROP CONSTRAINT "UserReadList_client_id_fkey";

-- DropForeignKey
ALTER TABLE "UserReadList" DROP CONSTRAINT "UserReadList_media_id_fkey";

-- DropForeignKey
ALTER TABLE "_MediaToMediaGenres" DROP CONSTRAINT "_MediaToMediaGenres_A_fkey";

-- DropForeignKey
ALTER TABLE "_MediaToMediaGenres" DROP CONSTRAINT "_MediaToMediaGenres_B_fkey";

-- DropForeignKey
ALTER TABLE "_PromotionToSubscription" DROP CONSTRAINT "_PromotionToSubscription_A_fkey";

-- DropForeignKey
ALTER TABLE "_PromotionToSubscription" DROP CONSTRAINT "_PromotionToSubscription_B_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_client_id_fkey";

-- DropForeignKey
ALTER TABLE "promotion_usages" DROP CONSTRAINT "promotion_usages_client_id_fkey";

-- DropForeignKey
ALTER TABLE "user_history" DROP CONSTRAINT "user_history_client_id_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_staffMember_id_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_subscriber_id_fkey";

-- DropForeignKey
ALTER TABLE "viewers" DROP CONSTRAINT "viewers_subscription_id_fkey";

-- DropIndex
DROP INDEX "users_staffMember_id_key";

-- DropIndex
DROP INDEX "users_subscriber_id_key";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "staffMember_id",
DROP COLUMN "subscriber_id",
ADD COLUMN     "role" "user_roles" NOT NULL DEFAULT 'subscriber';

-- DropTable
DROP TABLE "OrderItem";

-- DropTable
DROP TABLE "OrderRefund";

-- DropTable
DROP TABLE "UserReadList";

-- DropTable
DROP TABLE "_MediaToMediaGenres";

-- DropTable
DROP TABLE "_PromotionToSubscription";

-- DropTable
DROP TABLE "staff";

-- DropTable
DROP TABLE "viewers";

-- DropEnum
DROP TYPE "staff_roles";

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
CREATE TABLE "user_read_lists" (
    "id" SERIAL NOT NULL,
    "client_id" BIGINT NOT NULL,
    "media_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "user_read_lists_pkey" PRIMARY KEY ("id")
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
ALTER TABLE "user_read_lists" ADD CONSTRAINT "user_read_lists_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "subscribers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_read_lists" ADD CONSTRAINT "user_read_lists_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "medias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_history" ADD CONSTRAINT "user_history_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "subscribers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_usages" ADD CONSTRAINT "promotion_usages_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "subscribers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "subscribers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_refunds" ADD CONSTRAINT "order_refunds_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_media_to_media_genres" ADD CONSTRAINT "_media_to_media_genres_A_fkey" FOREIGN KEY ("A") REFERENCES "medias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_media_to_media_genres" ADD CONSTRAINT "_media_to_media_genres_B_fkey" FOREIGN KEY ("B") REFERENCES "media_genres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_promotion_to_subscription" ADD CONSTRAINT "_promotion_to_subscription_A_fkey" FOREIGN KEY ("A") REFERENCES "promotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_promotion_to_subscription" ADD CONSTRAINT "_promotion_to_subscription_B_fkey" FOREIGN KEY ("B") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
