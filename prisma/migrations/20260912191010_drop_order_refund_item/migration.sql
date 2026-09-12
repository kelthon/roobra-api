/*
  Warnings:

  - You are about to drop the `order_refund_items` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "order_refund_items" DROP CONSTRAINT "order_refund_items_order_item_id_fkey";

-- DropForeignKey
ALTER TABLE "order_refund_items" DROP CONSTRAINT "order_refund_items_order_refund_id_fkey";

-- DropTable
DROP TABLE "order_refund_items";
