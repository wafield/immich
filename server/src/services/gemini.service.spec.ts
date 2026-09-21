import { BadRequestException } from '@nestjs/common';
import { vitest } from 'vitest';
import { GeminiService } from 'src/services/gemini.service.js';
import { authStub } from 'test/fixtures/auth.stub.js';
import { ServiceMocks, newTestService } from 'test/utils.js';

const { generateContentMock } = vitest.hoisted(() => ({
  generateContentMock: vitest.fn(),
}));

vitest.mock('@google/genai', () => {
  return {
    GoogleGenAI: class MockGoogleGenAI {
      models = {
        generateContent: generateContentMock,
      };
    },
  };
});

describe(GeminiService.name, () => {
  let sut: GeminiService;
  let mocks: ServiceMocks;

  beforeEach(() => {
    vitest.clearAllMocks();
    ({ sut, mocks } = newTestService(GeminiService));
    mocks.config.getEnv.mockReturnValue({
      gemini: {
        apiKey: 'test-api-key',
        model: 'gemini-3.8-flash',
      },
    } as any);
  });

  it('should be defined', () => {
    expect(sut).toBeDefined();
  });

  it('should throw BadRequestException if apiKey is missing', async () => {
    mocks.config.getEnv.mockReturnValue({
      gemini: {
        apiKey: '',
        model: 'gemini-3.8-flash',
      },
    } as any);
    delete process.env.GEMINI_API_KEY;

    await expect(sut.generateContent(authStub.user1, { prompt: 'Hello' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw BadRequestException if neither prompt nor image is provided', async () => {
    await expect(sut.generateContent(authStub.user1, {})).rejects.toThrow(BadRequestException);
  });

  it('should generate content with text prompt only', async () => {
    generateContentMock.mockResolvedValue({ text: 'Gemini response text' });

    const result = await sut.generateContent(authStub.user1, { prompt: 'Explain quantum computing' });

    expect(result).toEqual({ text: 'Gemini response text' });
    expect(generateContentMock).toHaveBeenCalledWith({
      model: 'gemini-3.8-flash',
      contents: [{ text: 'Explain quantum computing' }],
    });
  });

  it('should generate content with image only', async () => {
    generateContentMock.mockResolvedValue({ text: 'A photo of a cat' });

    const result = await sut.generateContent(authStub.user1, {
      image: { data: 'aW1hZ2VkYXRh', mimeType: 'image/jpeg' },
    });

    expect(result).toEqual({ text: 'A photo of a cat' });
    expect(generateContentMock).toHaveBeenCalledWith({
      model: 'gemini-3.8-flash',
      contents: [{ inlineData: { mimeType: 'image/jpeg', data: 'aW1hZ2VkYXRh' } }],
    });
  });

  it('should generate content with both text prompt and image (multimodal)', async () => {
    generateContentMock.mockResolvedValue({ text: 'This image shows a sunset over mountains' });

    const result = await sut.generateContent(authStub.user1, {
      prompt: 'Describe what you see in this photo',
      image: { data: 'c3Vuc2V0ZGF0YQ==', mimeType: 'image/png' },
    });

    expect(result).toEqual({ text: 'This image shows a sunset over mountains' });
    expect(generateContentMock).toHaveBeenCalledWith({
      model: 'gemini-3.8-flash',
      contents: [
        { text: 'Describe what you see in this photo' },
        { inlineData: { mimeType: 'image/png', data: 'c3Vuc2V0ZGF0YQ==' } },
      ],
    });
  });

  it('should generate content using assetId', async () => {
    mocks.access.asset.checkOwnerAccess.mockResolvedValue(new Set(['11111111-1111-1111-1111-111111111111']));
    mocks.asset.getForThumbnail.mockResolvedValue({
      originalPath: '/path/to/asset.jpg',
      originalFileName: 'asset.jpg',
      path: '/path/to/preview.jpg',
    });
    mocks.storage.readFile.mockResolvedValue(Buffer.from('fake-asset-bytes'));
    generateContentMock.mockResolvedValue({ text: 'Identified landmarks in asset' });

    const result = await sut.generateContent(authStub.user1, {
      prompt: 'Identify landmarks',
      assetId: '11111111-1111-1111-1111-111111111111',
    });

    expect(result).toEqual({ text: 'Identified landmarks in asset' });
    expect(generateContentMock).toHaveBeenCalledWith({
      model: 'gemini-3.8-flash',
      contents: [
        { text: 'Identify landmarks' },
        { inlineData: { mimeType: 'image/jpeg', data: Buffer.from('fake-asset-bytes').toString('base64') } },
      ],
    });
    expect(mocks.asset.createGenAi).toHaveBeenCalledWith({
      assetId: '11111111-1111-1111-1111-111111111111',
      prompt: 'Identify landmarks',
      response: 'Identified landmarks in asset',
      modelName: 'gemini-3.8-flash',
      createdAt: expect.any(Date),
    });
  });

  it('should not save genai entry if assetId is not provided', async () => {
    generateContentMock.mockResolvedValue({ text: 'Response without asset' });

    const result = await sut.generateContent(authStub.user1, {
      prompt: 'Question without asset',
    });

    expect(result).toEqual({ text: 'Response without asset' });
    expect(mocks.asset.createGenAi).not.toHaveBeenCalled();
  });

  it('should retrieve genai history for an asset', async () => {
    const assetId = '11111111-1111-1111-1111-111111111111';
    mocks.access.asset.checkOwnerAccess.mockResolvedValue(new Set([assetId]));
    const fakeHistory = [
      {
        id: 'rec-1',
        assetId,
        prompt: 'Prompt 1',
        response: 'Response 1',
        modelName: 'gemini-3.8-flash',
        createdAt: new Date('2026-09-20T10:00:00Z'),
        deletedAt: null,
      },
    ];
    mocks.asset.getGenAiByAssetId.mockResolvedValue(fakeHistory as any);

    const result = await sut.getGenAiHistory(authStub.user1, assetId);

    expect(result).toEqual([
      {
        id: 'rec-1',
        assetId,
        prompt: 'Prompt 1',
        response: 'Response 1',
        modelName: 'gemini-3.8-flash',
        createdAt: '2026-09-20T10:00:00.000Z',
        deletedAt: null,
      },
    ]);
    expect(mocks.asset.getGenAiByAssetId).toHaveBeenCalledWith(assetId);
  });
});
