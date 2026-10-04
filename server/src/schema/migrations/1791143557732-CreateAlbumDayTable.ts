import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await sql`CREATE TABLE "album_day" (
  "albumId" uuid NOT NULL,
  "date" date NOT NULL,
  "description" text NOT NULL DEFAULT '',
  "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "album_day_pkey" PRIMARY KEY ("albumId", "date"),
  CONSTRAINT "album_day_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "album" ("id") ON UPDATE CASCADE ON DELETE CASCADE
);`.execute(db);
  await sql`CREATE INDEX "album_day_albumId_idx" ON "album_day" ("albumId");`.execute(db);
  await sql`CREATE OR REPLACE FUNCTION album_day_updated_at()
  RETURNS TRIGGER
  LANGUAGE PLPGSQL
  AS $$
  BEGIN
    NEW."updatedAt" = clock_timestamp();
    RETURN NEW;
  END;
  $$;`.execute(db);
  await sql`CREATE OR REPLACE TRIGGER "album_day_updatedAt"
  BEFORE UPDATE ON "album_day"
  FOR EACH ROW
  EXECUTE FUNCTION album_day_updated_at();`.execute(db);
  await sql`INSERT INTO "migration_overrides" ("name", "value") VALUES ('trigger_album_day_updatedAt', '{"type":"trigger","name":"album_day_updatedAt","sql":"CREATE OR REPLACE TRIGGER \\"album_day_updatedAt\\"\\n  BEFORE UPDATE ON \\"album_day\\"\\n  FOR EACH ROW\\n  EXECUTE FUNCTION album_day_updated_at();"}'::jsonb);`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TRIGGER "album_day_updatedAt" ON "album_day";`.execute(db);
  await sql`DROP FUNCTION album_day_updated_at;`.execute(db);
  await sql`DROP TABLE "album_day";`.execute(db);
  await sql`DELETE FROM "migration_overrides" WHERE "name" = 'trigger_album_day_updatedAt';`.execute(db);
}
