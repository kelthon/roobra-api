-- Rename the table to the plural used by every other table, keeping its rows. Prisma would
-- otherwise drop and recreate it. The constraint, index and sequence names follow, so they match
-- the names Prisma derives from the new table name.
ALTER TABLE "email_verification_token" RENAME TO "email_verification_tokens";
ALTER SEQUENCE "email_verification_token_id_seq" RENAME TO "email_verification_tokens_id_seq";
ALTER TABLE "email_verification_tokens" RENAME CONSTRAINT "email_verification_token_pkey" TO "email_verification_tokens_pkey";
ALTER TABLE "email_verification_tokens" RENAME CONSTRAINT "email_verification_token_user_id_fkey" TO "email_verification_tokens_user_id_fkey";
ALTER INDEX "email_verification_token_hashed_token_key" RENAME TO "email_verification_tokens_hashed_token_key";
