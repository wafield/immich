import request from 'supertest';
import { GeminiController } from 'src/controllers/gemini.controller.js';
import { GeminiService } from 'src/services/gemini.service.js';
import { ControllerContext, controllerSetup, mockBaseService } from 'test/utils.js';

describe(GeminiController.name, () => {
  let ctx: ControllerContext;
  const service = mockBaseService(GeminiService);

  beforeAll(async () => {
    ctx = await controllerSetup(GeminiController, [{ provide: GeminiService, useValue: service }]);
    return () => ctx.close();
  });

  beforeEach(() => {
    service.resetAllMocks();
    ctx.reset();
  });

  describe('POST /gemini', () => {
    it('should be an authenticated route', async () => {
      await request(ctx.getHttpServer()).post('/gemini').send({ prompt: 'Hello' });
      expect(ctx.authenticate).toHaveBeenCalled();
    });

    it('should call service.generateContent with body and return 200', async () => {
      service.generateContent.mockResolvedValue({ text: 'Hello from Gemini!' });

      const { status, body } = await request(ctx.getHttpServer())
        .post('/gemini')
        .send({ prompt: 'Hello' });

      expect(status).toBe(200);
      expect(body).toEqual({ text: 'Hello from Gemini!' });
      expect(service.generateContent).toHaveBeenCalledWith(undefined, { prompt: 'Hello' });
    });
  });

  describe('POST /gemini/generate', () => {
    it('should call service.generateContent on alias route', async () => {
      service.generateContent.mockResolvedValue({ text: 'Multimodal answer' });

      const { status, body } = await request(ctx.getHttpServer())
        .post('/gemini/generate')
        .send({ prompt: 'Describe', image: { data: 'abc', mimeType: 'image/jpeg' } });

      expect(status).toBe(200);
      expect(body).toEqual({ text: 'Multimodal answer' });
      expect(service.generateContent).toHaveBeenCalledWith(undefined, {
        prompt: 'Describe',
        image: { data: 'abc', mimeType: 'image/jpeg' },
      });
    });
  });
});
