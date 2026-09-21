import { createZodDto } from 'nestjs-zod';
import z from 'zod';

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
