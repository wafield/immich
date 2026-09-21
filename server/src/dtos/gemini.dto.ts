import { createZodDto } from 'nestjs-zod';
import z from 'zod';
import { asDateTimeString } from 'src/utils/date.js';

const GeminiImageInputSchema = z
  .object({
    data: z.string().describe('Base64-encoded image bytes'),
    mimeType: z.string().describe('MIME type of the image, e.g. image/jpeg, image/png, image/webp'),
  })
  .meta({ id: 'GeminiImageInputDto' });

export class GeminiImageInputDto extends createZodDto(GeminiImageInputSchema) {}

const GeminiRequestSchema = z
  .object({
    prompt: z.string().optional().describe('Text prompt or question for Gemini'),
    text: z.string().optional().describe('Alternative alias for prompt'),
    image: GeminiImageInputSchema.optional().describe('Optional inline base64-encoded image data with MIME type'),
    assetId: z.uuidv4().optional().describe('Optional Immich asset ID to use as image input'),
  })
  .meta({ id: 'GeminiRequestDto' });

export class GeminiRequestDto extends createZodDto(GeminiRequestSchema) {}

const GeminiResponseSchema = z
  .object({
    text: z.string().describe('Generated response text from Gemini'),
  })
  .meta({ id: 'GeminiResponseDto' });

export class GeminiResponseDto extends createZodDto(GeminiResponseSchema) {}

const AssetGenAiResponseSchema = z
  .object({
    id: z.string().describe('ID of the GenAI response entry'),
    assetId: z.string().describe('Asset ID associated with the response'),
    prompt: z.string().describe('Prompt sent to Gemini'),
    response: z.string().describe('Generated response from Gemini'),
    modelName: z.string().describe('Model name used for generation'),
    createdAt: z.string().meta({ format: 'date-time' }).describe('Timestamp when the response was generated'),
    deletedAt: z.string().meta({ format: 'date-time' }).nullable().describe('Deletion timestamp, or null if active'),
  })
  .meta({ id: 'AssetGenAiResponseDto' });

export class AssetGenAiResponseDto extends createZodDto(AssetGenAiResponseSchema) {}

export const mapAssetGenAi = (entity: {
  id: string;
  assetId: string;
  prompt: string;
  response: string;
  modelName: string;
  createdAt: Date;
  deletedAt: Date | null;
}): AssetGenAiResponseDto => ({
  id: entity.id,
  assetId: entity.assetId,
  prompt: entity.prompt,
  response: entity.response,
  modelName: entity.modelName,
  createdAt: asDateTimeString(entity.createdAt),
  deletedAt: entity.deletedAt ? asDateTimeString(entity.deletedAt) : null,
});
