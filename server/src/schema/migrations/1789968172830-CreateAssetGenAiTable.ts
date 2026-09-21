import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await sql`CREATE TABLE "asset_genai" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "assetId" uuid NOT NULL,
  "prompt" text NOT NULL,
  "response" text NOT NULL,
  "modelName" character varying(255) NOT NULL,
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  "deletedAt" timestamp with time zone,
  CONSTRAINT "asset_genai_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "asset_genai_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "asset" ("id") ON UPDATE CASCADE ON DELETE CASCADE
);`.execute(db);
  await sql`CREATE INDEX "asset_genai_assetId_idx" ON "asset_genai" ("assetId");`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE "asset_genai";`.execute(db);
}
