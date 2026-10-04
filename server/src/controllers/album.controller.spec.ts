import request from 'supertest';
import { AlbumController } from 'src/controllers/album.controller.js';
import { AlbumService } from 'src/services/album.service.js';
import { factory } from 'test/small.factory.js';
import { ControllerContext, controllerSetup, mockBaseService } from 'test/utils.js';

describe(AlbumController.name, () => {
  let ctx: ControllerContext;
  const service = mockBaseService(AlbumService);

  beforeAll(async () => {
    ctx = await controllerSetup(AlbumController, [{ provide: AlbumService, useValue: service }]);
    return () => ctx.close();
  });

  beforeEach(() => {
    service.resetAllMocks();
    ctx.reset();
  });

  describe('GET /albums', () => {
    it('should reject an invalid shared param', async () => {
      const { status, body } = await request(ctx.getHttpServer()).get('/albums?isShared=invalid');
      expect(status).toEqual(400);
      expect(body).toEqual(
        factory.responses.validationError([
          { path: ['isShared'], message: 'Invalid option: expected one of "true"|"false"' },
        ]),
      );
    });

    it('should reject an invalid assetId param', async () => {
      const { status, body } = await request(ctx.getHttpServer()).get('/albums?assetId=invalid');
      expect(status).toEqual(400);
      expect(body).toEqual(factory.responses.validationError([{ path: ['assetId'], message: 'Invalid UUID' }]));
    });
  });

  describe('Album Day endpoints', () => {
    it('should update album day description via PUT /albums/:id/day', async () => {
      const albumId = factory.uuid();
      service.updateDay.mockResolvedValue({ date: '2026-10-04', description: 'Fun day' });

      const { status, body } = await request(ctx.getHttpServer())
        .put(`/albums/${albumId}/day`)
        .send({ date: '2026-10-04', description: 'Fun day' });

      expect(status).toEqual(200);
      expect(body).toEqual({ date: '2026-10-04', description: 'Fun day' });
      expect(service.updateDay).toHaveBeenCalledWith(
        undefined,
        albumId,
        { date: '2026-10-04', description: 'Fun day' },
      );
    });

    it('should update album day description via PUT /albums/:id/days', async () => {
      const albumId = factory.uuid();
      service.updateDay.mockResolvedValue({ date: '2026-10-04', description: 'Fun day' });

      const { status, body } = await request(ctx.getHttpServer())
        .put(`/albums/${albumId}/days`)
        .send({ date: '2026-10-04', description: 'Fun day' });

      expect(status).toEqual(200);
      expect(body).toEqual({ date: '2026-10-04', description: 'Fun day' });
      expect(service.updateDay).toHaveBeenCalledWith(
        undefined,
        albumId,
        { date: '2026-10-04', description: 'Fun day' },
      );
    });

    it('should update album day description via PUT /albums/:id/day/:date', async () => {
      const albumId = factory.uuid();
      service.updateDay.mockResolvedValue({ date: '2026-10-04', description: 'Trip day' });

      const { status, body } = await request(ctx.getHttpServer())
        .put(`/albums/${albumId}/day/2026-10-04`)
        .send({ description: 'Trip day' });

      expect(status).toEqual(200);
      expect(body).toEqual({ date: '2026-10-04', description: 'Trip day' });
      expect(service.updateDay).toHaveBeenCalledWith(
        undefined,
        albumId,
        { description: 'Trip day' },
        '2026-10-04',
      );
    });

    it('should get album day descriptions via GET /albums/:id/days', async () => {
      const albumId = factory.uuid();
      service.getDays.mockResolvedValue([{ date: '2026-10-04', description: 'Day 1' }]);

      const { status, body } = await request(ctx.getHttpServer()).get(`/albums/${albumId}/days`);

      expect(status).toEqual(200);
      expect(body).toEqual([{ date: '2026-10-04', description: 'Day 1' }]);
      expect(service.getDays).toHaveBeenCalledWith(undefined, albumId);
    });
  });
});
