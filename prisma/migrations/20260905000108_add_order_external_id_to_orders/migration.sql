/*
  Warnings:

  - A unique constraint covering the columns `[order_external_id]` on the table `orders` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `order_external_id` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "order_external_id" VARCHAR(255) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_external_id_key" ON "orders"("order_external_id");
