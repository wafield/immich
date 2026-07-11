import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE "asset_exif" 
    ADD COLUMN "shutter" character varying,
    ADD COLUMN "releaseMode" character varying,
    ADD COLUMN "flash" character varying,
    ADD COLUMN "flashAction" character varying,
    ADD COLUMN "electronicFrontCurtainShutter" character varying,
    ADD COLUMN "customRendered" character varying,
    ADD COLUMN "dynamicRange" character varying,
    ADD COLUMN "developmentDynamicRange" character varying,
    ADD COLUMN "afAreaModeSetting" character varying,
    ADD COLUMN "afMode" character varying,
    ADD COLUMN "sharpnessRange" character varying,
    ADD COLUMN "grainEffectSize" character varying,
    ADD COLUMN "grainEffectRoughness" character varying,
    ADD COLUMN "sceneCaptureType" character varying,
    ADD COLUMN "fade" character varying,
    ADD COLUMN "historySoftwareAgent" character varying,
    ADD COLUMN "software" character varying,
    ADD COLUMN "userComment" character varying,
    ADD COLUMN "creatorTool" character varying,
    ADD COLUMN "actionsSoftwareAgentName" character varying,
    ADD COLUMN "actionsDescription" character varying,
    ADD COLUMN "claimGeneratorInfoName" character varying,
    ADD COLUMN "ambientTemperature" character varying,
    ADD COLUMN "numberOfImages" character varying,
    ADD COLUMN "mpImageLength" character varying;`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE "asset_exif" 
    DROP COLUMN "shutter",
    DROP COLUMN "releaseMode",
    DROP COLUMN "flash",
    DROP COLUMN "flashAction",
    DROP COLUMN "electronicFrontCurtainShutter",
    DROP COLUMN "customRendered",
    DROP COLUMN "dynamicRange",
    DROP COLUMN "developmentDynamicRange",
    DROP COLUMN "afAreaModeSetting",
    DROP COLUMN "afMode",
    DROP COLUMN "sharpnessRange",
    DROP COLUMN "grainEffectSize",
    DROP COLUMN "grainEffectRoughness",
    DROP COLUMN "sceneCaptureType",
    DROP COLUMN "fade",
    DROP COLUMN "historySoftwareAgent",
    DROP COLUMN "software",
    DROP COLUMN "userComment",
    DROP COLUMN "creatorTool",
    DROP COLUMN "actionsSoftwareAgentName",
    DROP COLUMN "actionsDescription",
    DROP COLUMN "claimGeneratorInfoName",
    DROP COLUMN "ambientTemperature",
    DROP COLUMN "numberOfImages",
    DROP COLUMN "mpImageLength";`.execute(db);
}
