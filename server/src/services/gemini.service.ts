import { GoogleGenAI, type Part } from '@google/genai';
import { BadRequestException, Injectable } from '@nestjs/common';
import { AuthDto } from 'src/dtos/auth.dto.js';
import { AssetGenAiResponseDto, GeminiRequestDto, GeminiResponseDto, mapAssetGenAi } from 'src/dtos/gemini.dto.js';
import { AssetFileType, Permission } from 'src/enum.js';
import { BaseService } from 'src/services/base.service.js';
import { mimeTypes } from 'src/utils/mime-types.js';

@Injectable()
export class GeminiService extends BaseService {
  private get geminiConfig() {
    const { gemini } = this.configRepository.getEnv();
    return {
      apiKey: gemini?.apiKey || process.env.GEMINI_API_KEY || '',
      model: gemini?.model || process.env.GEMINI_MODEL || 'gemini-3.8-flash',
    };
  }

  async generateContent(auth: AuthDto, dto: GeminiRequestDto): Promise<GeminiResponseDto> {
    const { apiKey, model } = this.geminiConfig;

    if (!apiKey) {
      throw new BadRequestException('Gemini API key is not configured. Please set GEMINI_API_KEY in your .env file.');
    }

    const parts: Part[] = [];

    const promptText = dto.prompt || dto.text;
    if (promptText) {
      parts.push({ text: promptText });
    }

    if (dto.image) {
      parts.push({
        inlineData: {
          mimeType: dto.image.mimeType,
          data: dto.image.data,
        },
      });
    } else if (dto.assetId) {
      await this.requireAccess({ auth, permission: Permission.AssetView, ids: [dto.assetId] });

      const { originalPath, path } = await this.assetRepository.getForThumbnail(
        dto.assetId,
        AssetFileType.Preview,
        false,
      );

      const filePath = path || originalPath;
      const buffer = await this.storageRepository.readFile(filePath);
      const mimeType = mimeTypes.lookup(filePath) || 'image/jpeg';

      parts.push({
        inlineData: {
          mimeType,
          data: buffer.toString('base64'),
        },
      });
    }

    if (parts.length === 0) {
      throw new BadRequestException('Either text prompt or image must be provided.');
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model,
        contents: parts,
      });

      const responseText = response.text ?? '';

      if (dto.assetId) {
        await this.assetRepository.createGenAi({
          assetId: dto.assetId,
          prompt: promptText ?? '',
          response: responseText,
          modelName: model,
          createdAt: new Date(),
        });
      }

      return {
        text: responseText,
      };
    } catch (error: any) {
      this.logger.error(`Gemini API error: ${error?.message || error}`, error?.stack);
      throw new BadRequestException(`Gemini API error: ${error?.message || 'Failed to generate content'}`);
    }
  }

  async getGenAiHistory(auth: AuthDto, assetId: string): Promise<AssetGenAiResponseDto[]> {
    await this.requireAccess({ auth, permission: Permission.AssetRead, ids: [assetId] });
    const history = await this.assetRepository.getGenAiByAssetId(assetId);
    return history.map(mapAssetGenAi);
  }
}
