import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Endpoint, HistoryBuilder } from 'src/decorators.js';
import type { AuthDto } from 'src/dtos/auth.dto.js';
import { GeminiRequestDto, GeminiResponseDto } from 'src/dtos/gemini.dto.js';
import { ApiTag } from 'src/enum.js';
import { Auth, Authenticated } from 'src/middleware/auth.guard.js';
import { GeminiService } from 'src/services/gemini.service.js';

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
}
