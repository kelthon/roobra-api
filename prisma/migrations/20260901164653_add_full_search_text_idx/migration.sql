-- CreateExtension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Joins a text[] into a single space-separated string, for feeding into to_tsvector.
-- Marked IMMUTABLE (unlike the built-in array_to_string) so it's usable in a
-- GENERATED ALWAYS AS ... STORED column.
CREATE OR REPLACE FUNCTION immutable_array_to_string(text[], text)
RETURNS text AS $$
  SELECT array_to_string($1, $2);
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT;

-- AlterTable
ALTER TABLE "medias"
ADD COLUMN "searchable_text" tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce("name", '')), 'A') ||
    setweight(to_tsvector('simple', immutable_array_to_string("authors", ' ')), 'B') ||
    setweight(to_tsvector('simple', coalesce("description", '')), 'C')
) STORED;

-- AlterTable
ALTER TABLE "media_volumes"
ADD COLUMN "searchable_text" tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('simple', immutable_array_to_string("authors", ' ')), 'B') ||
    setweight(to_tsvector('simple', coalesce("description", '')), 'C')
) STORED;

-- CreateIndex
CREATE INDEX "users_username_trgm_idx" ON "users" USING GIN ("username" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "users_email_trgm_idx" ON "users" USING GIN ("email" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "medias_searchable_text_idx" ON "medias" USING GIN ("searchable_text");

-- CreateIndex
CREATE INDEX "media_volumes_searchable_text_idx" ON "media_volumes" USING GIN ("searchable_text");
