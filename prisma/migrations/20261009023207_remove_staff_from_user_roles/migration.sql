/*
  Warnings:

  - The values [staff] on the enum `user_roles` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "user_roles_new" AS ENUM ('subscriber', 'admin', 'content_manager', 'support_agent');
ALTER TABLE "public"."users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "user_roles_new" USING ("role"::text::"user_roles_new");
ALTER TYPE "user_roles" RENAME TO "user_roles_old";
ALTER TYPE "user_roles_new" RENAME TO "user_roles";
DROP TYPE "public"."user_roles_old";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'subscriber';
COMMIT;
