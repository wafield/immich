import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await sql`CREATE TABLE "deleted_asset_tombstone" (
  "id" uuid NOT NULL DEFAULT immich_uuid_v7(),
  "assetId" uuid,
  "ownerId" uuid NOT NULL,
  "checksum" bytea NOT NULL,
  "deletedAt" timestamp with time zone NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT "deleted_asset_tombstone_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "deleted_asset_tombstone_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user" ("id") ON UPDATE CASCADE ON DELETE CASCADE
);`.execute(db);
  await sql`CREATE UNIQUE INDEX "UQ_deleted_asset_tombstone_owner_checksum" ON "deleted_asset_tombstone" ("ownerId", "checksum");`.execute(db);
  await sql`CREATE OR REPLACE FUNCTION asset_delete_tombstone()
  RETURNS TRIGGER
  LANGUAGE PLPGSQL
  AS $$
    BEGIN
      INSERT INTO deleted_asset_tombstone ("assetId", "ownerId", "checksum")
      SELECT DISTINCT ON ("ownerId", "checksum") "id", "ownerId", "checksum"
      FROM OLD
      ON CONFLICT ("ownerId", "checksum") DO NOTHING;
      RETURN NULL;
    END
  $$;`.execute(db);
  await sql`CREATE OR REPLACE TRIGGER "asset_delete_tombstone"
  AFTER DELETE ON "asset"
  REFERENCING OLD TABLE AS "old"
  FOR EACH STATEMENT
  WHEN (pg_trigger_depth() = 0)
  EXECUTE FUNCTION asset_delete_tombstone();`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TRIGGER IF EXISTS "asset_delete_tombstone" ON "asset";`.execute(db);
  await sql`DROP FUNCTION IF EXISTS asset_delete_tombstone;`.execute(db);
  await sql`DROP TABLE IF EXISTS "deleted_asset_tombstone";`.execute(db);
}

