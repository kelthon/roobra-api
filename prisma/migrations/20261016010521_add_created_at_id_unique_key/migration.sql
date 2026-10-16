/*
  Warnings:

  - A unique constraint covering the columns `[created_at,id]` on the table `medias` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[created_at,id]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "medias_created_at_id_key" ON "medias"("created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "users_created_at_id_key" ON "users"("created_at", "id");
