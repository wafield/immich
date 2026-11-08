import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE "library" ADD "isUploadDestination" boolean NOT NULL DEFAULT false;`.execute(db);
  await sql`CREATE UNIQUE INDEX "IDX_library_owner_is_upload_destination" ON "library" ("ownerId") WHERE ("isUploadDestination" = true AND "deletedAt" IS NULL);`.execute(
    db,
  );
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP INDEX IF EXISTS "IDX_library_owner_is_upload_destination";`.execute(db);
  await sql`ALTER TABLE "library" DROP COLUMN "isUploadDestination";`.execute(db);
}

