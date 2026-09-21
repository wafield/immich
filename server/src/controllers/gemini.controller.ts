import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthDto } from 'src/dtos/auth.dto.js';
import { Endpoint, HistoryBuilder } from 'src/decorators.js';
import { AssetGenAiResponseDto, GeminiRequestDto, GeminiResponseDto } from 'src/dtos/gemini.dto.js';
import { ApiTag, Permission } from 'src/enum.js';
import { Auth, Authenticated } from 'src/middleware/auth.guard.js';
import { GeminiService } from 'src/services/gemini.service.js';
import { UUIDParamDto } from 'src/validation.js';

@ApiTags(ApiTag.Gemini)
@Controller('gemini')
export class GeminiController {
  constructor(private service: GeminiService) {}

  @Post()
  @Authenticated()
  @HttpCode(HttpStatus.OK)
  @Endpoint({
    summary: 'Generate content using Google Gemini',
    description: 'Send a multimodal request (text, image, or both) to Google Gemini API.',
    history: new HistoryBuilder().added('v3'),
  })
  generateContent(@Auth() auth: AuthDto, @Body() dto: GeminiRequestDto): Promise<GeminiResponseDto> {
    return this.service.generateContent(auth, dto);
  }

  @Post('generate')
  @Authenticated()
  @HttpCode(HttpStatus.OK)
  @Endpoint({
    summary: 'Generate content using Google Gemini (alias)',
    description: 'Send a multimodal request (text, image, or both) to Google Gemini API.',
    history: new HistoryBuilder().added('v3'),
  })
  generateContentAlias(@Auth() auth: AuthDto, @Body() dto: GeminiRequestDto): Promise<GeminiResponseDto> {
    return this.service.generateContent(auth, dto);
  }

  @Get('asset/:id')
  @Authenticated({ permission: Permission.AssetRead })
  @Endpoint({
    summary: 'Retrieve GenAI responses for an asset',
    description: 'Retrieve all historical Gemini responses for a specific asset.',
    history: new HistoryBuilder().added('v3'),
  })
  getGenAiHistory(@Auth() auth: AuthDto, @Param() { id }: UUIDParamDto): Promise<AssetGenAiResponseDto[]> {
    return this.service.getGenAiHistory(auth, id);
  }
}
