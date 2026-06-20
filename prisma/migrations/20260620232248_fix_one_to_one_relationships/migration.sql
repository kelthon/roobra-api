/*
  Warnings:

  - A unique constraint covering the columns `[user_id]` on the table `staff_members` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id]` on the table `subscribers` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "staff_members_user_id_key" ON "staff_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscribers_user_id_key" ON "subscribers"("user_id");
