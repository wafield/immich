import { BadRequestException } from '@nestjs/common';
import { mapAsset } from 'src/dtos/asset-response.dto';
import { SearchSuggestionType } from 'src/dtos/search.dto';
import { SearchService } from 'src/services/search.service';
import { AssetFactory } from 'test/factories/asset.factory';
import { AuthFactory } from 'test/factories/auth.factory';
import { authStub } from 'test/fixtures/auth.stub';
import { getForAsset } from 'test/mappers';
import { newTestService, ServiceMocks } from 'test/utils';
import { beforeEach, vitest } from 'vitest';

vitest.useFakeTimers();

describe(SearchService.name, () => {
  let sut: SearchService;
  let mocks: ServiceMocks;

  beforeEach(() => {
    ({ sut, mocks } = newTestService(SearchService));
    mocks.partner.getAll.mockResolvedValue([]);
  });

  it('should work', () => {
    expect(sut).toBeDefined();
  });

  describe('searchPerson', () => {
    it('should pass options to search', async () => {
      const auth = AuthFactory.create();
      const name = 'foo';

      mocks.person.getByName.mockResolvedValue([]);

      await sut.searchPerson(auth, { name, withHidden: false });

      expect(mocks.person.getByName).toHaveBeenCalledWith(auth.user.id, name, { withHidden: false });

      await sut.searchPerson(auth, { name, withHidden: true });

      expect(mocks.person.getByName).toHaveBeenCalledWith(auth.user.id, name, { withHidden: true });
    });
  });

  describe('searchPlaces', () => {
    it('should search places', async () => {
      mocks.search.searchPlaces.mockResolvedValue([
        {
          id: 42,
          name: 'my place',
          latitude: 420,
          longitude: 69,
          admin1Code: null,
          admin1Name: null,
          admin2Code: null,
          admin2Name: null,
          alternateNames: null,
          countryCode: 'US',
          modificationDate: new Date(),
        },
      ]);

      await sut.searchPlaces({ name: 'place' });
      expect(mocks.search.searchPlaces).toHaveBeenCalledWith('place');
    });
  });

  describe('getExploreData', () => {
    it('should get recent assets and assets by city and tag', async () => {
      const auth = AuthFactory.create();
      const asset = AssetFactory.from()
        .exif({ latitude: 42, longitude: 69, city: 'city', state: 'state', country: 'country' })
        .build();
      mocks.asset.getAssetIdByCity.mockResolvedValue({
        fieldName: 'exifInfo.city',
        items: [{ value: 'city', data: asset.id }],
      });
      mocks.asset.getRecentlyCreatedAssetIds.mockResolvedValue({
        fieldName: 'createdAt',
        items: [{ value: asset.createdAt, data: asset.id }],
      });
      mocks.asset.getByIdsWithAllRelationsButStacks.mockResolvedValue([asset as never]);
      const expectedResponse = [
        { fieldName: 'exifInfo.city', items: [{ value: 'city', data: mapAsset(getForAsset(asset)) }] },
        {
          fieldName: 'createdAt',
          items: [{ value: asset.createdAt.toISOString(), data: mapAsset(getForAsset(asset)) }],
        },
      ];

      const result = await sut.getExploreData(auth);

      expect(result).toEqual(expectedResponse);
    });
  });

  describe('getSearchSuggestions', () => {
    it('should return search suggestions for country', async () => {
      const mockResult = [{ suggestion: 'USA', startTime: new Date('2023-01-01'), endTime: new Date('2023-01-02'), assetCount: 5 }];
      mocks.search.getCountries.mockResolvedValue([...mockResult]);
      mocks.partner.getAll.mockResolvedValue([]);

      const dto = { includeNull: false, type: SearchSuggestionType.COUNTRY };
      await expect(
        sut.getSearchSuggestions(authStub.user1, dto),
      ).resolves.toEqual(mockResult);
      expect(mocks.search.getCountries).toHaveBeenCalledWith([authStub.user1.user.id]);
    });

    it('should return search suggestions for country (including null)', async () => {
      const mockResult = [{ suggestion: 'USA', startTime: new Date('2023-01-01'), endTime: new Date('2023-01-02'), assetCount: 5 }];
      mocks.search.getCountries.mockResolvedValue([...mockResult]);
      mocks.partner.getAll.mockResolvedValue([]);

      const dto = { includeNull: true, type: SearchSuggestionType.COUNTRY };
      await expect(
        sut.getSearchSuggestions(authStub.user1, dto),
      ).resolves.toEqual([
        ...mockResult,
        { suggestion: null, startTime: null, endTime: null, assetCount: 0 },
      ]);
      expect(mocks.search.getCountries).toHaveBeenCalledWith([authStub.user1.user.id]);
    });

    it('should return search suggestions for state', async () => {
      const mockResult = [{ suggestion: 'California', startTime: new Date('2023-01-01'), endTime: new Date('2023-01-02'), assetCount: 3 }];
      mocks.search.getStates.mockResolvedValue([...mockResult]);
      mocks.partner.getAll.mockResolvedValue([]);

      const dto = { includeNull: false, type: SearchSuggestionType.STATE };
      await expect(
        sut.getSearchSuggestions(authStub.user1, dto),
      ).resolves.toEqual(mockResult);
      expect(mocks.search.getStates).toHaveBeenCalledWith([authStub.user1.user.id], dto);
    });

    it('should return search suggestions for state (including null)', async () => {
      const mockResult = [{ suggestion: 'California', startTime: new Date('2023-01-01'), endTime: new Date('2023-01-02'), assetCount: 3 }];
      mocks.search.getStates.mockResolvedValue([...mockResult]);
      mocks.partner.getAll.mockResolvedValue([]);

      const dto = { includeNull: true, type: SearchSuggestionType.STATE };
      await expect(
        sut.getSearchSuggestions(authStub.user1, dto),
      ).resolves.toEqual([
        ...mockResult,
        { suggestion: null, startTime: null, endTime: null, assetCount: 0 },
      ]);
      expect(mocks.search.getStates).toHaveBeenCalledWith([authStub.user1.user.id], dto);
    });

    it('should return search suggestions for city', async () => {
      const mockResult = [{ suggestion: 'Denver', startTime: new Date('2023-01-01'), endTime: new Date('2023-01-02'), assetCount: 4 }];
      mocks.search.getCities.mockResolvedValue([...mockResult]);
      mocks.partner.getAll.mockResolvedValue([]);

      const dto = { includeNull: false, type: SearchSuggestionType.CITY };
      await expect(
        sut.getSearchSuggestions(authStub.user1, dto),
      ).resolves.toEqual(mockResult);
      expect(mocks.search.getCities).toHaveBeenCalledWith([authStub.user1.user.id], dto);
    });

    it('should return search suggestions for city (including null)', async () => {
      const mockResult = [{ suggestion: 'Denver', startTime: new Date('2023-01-01'), endTime: new Date('2023-01-02'), assetCount: 4 }];
      mocks.search.getCities.mockResolvedValue([...mockResult]);
      mocks.partner.getAll.mockResolvedValue([]);

      const dto = { includeNull: true, type: SearchSuggestionType.CITY };
      await expect(
        sut.getSearchSuggestions(authStub.user1, dto),
      ).resolves.toEqual([
        ...mockResult,
        { suggestion: null, startTime: null, endTime: null, assetCount: 0 },
      ]);
      expect(mocks.search.getCities).toHaveBeenCalledWith([authStub.user1.user.id], dto);
    });

    it('should return search suggestions for camera make', async () => {
      const mockResult = [{ suggestion: 'Nikon', startTime: new Date('2023-01-01'), endTime: new Date('2023-01-02'), assetCount: 10 }];
      mocks.search.getCameraMakes.mockResolvedValue([...mockResult]);
      mocks.partner.getAll.mockResolvedValue([]);

      const dto = { includeNull: false, type: SearchSuggestionType.CAMERA_MAKE };
      await expect(
        sut.getSearchSuggestions(authStub.user1, dto),
      ).resolves.toEqual(mockResult);
      expect(mocks.search.getCameraMakes).toHaveBeenCalledWith([authStub.user1.user.id], dto);
    });

    it('should return search suggestions for camera make (including null)', async () => {
      const mockResult = [{ suggestion: 'Nikon', startTime: new Date('2023-01-01'), endTime: new Date('2023-01-02'), assetCount: 10 }];
      mocks.search.getCameraMakes.mockResolvedValue([...mockResult]);
      mocks.partner.getAll.mockResolvedValue([]);

      const dto = { includeNull: true, type: SearchSuggestionType.CAMERA_MAKE };
      await expect(
        sut.getSearchSuggestions(authStub.user1, dto),
      ).resolves.toEqual([
        ...mockResult,
        { suggestion: null, startTime: null, endTime: null, assetCount: 0 },
      ]);
      expect(mocks.search.getCameraMakes).toHaveBeenCalledWith([authStub.user1.user.id], dto);
    });

    it('should return search suggestions for camera model', async () => {
      const mockResult = [{ suggestion: 'Fujifilm X100VI', startTime: new Date('2023-01-01'), endTime: new Date('2023-01-02'), assetCount: 8 }];
      mocks.search.getCameraModels.mockResolvedValue([...mockResult]);
      mocks.partner.getAll.mockResolvedValue([]);

      const dto = { includeNull: false, type: SearchSuggestionType.CAMERA_MODEL };
      await expect(
        sut.getSearchSuggestions(authStub.user1, dto),
      ).resolves.toEqual(mockResult);
      expect(mocks.search.getCameraModels).toHaveBeenCalledWith([authStub.user1.user.id], dto);
    });

    it('should return search suggestions for camera model (including null)', async () => {
      const mockResult = [{ suggestion: 'Fujifilm X100VI', startTime: new Date('2023-01-01'), endTime: new Date('2023-01-02'), assetCount: 8 }];
      mocks.search.getCameraModels.mockResolvedValue([...mockResult]);
      mocks.partner.getAll.mockResolvedValue([]);

      const dto = { includeNull: true, type: SearchSuggestionType.CAMERA_MODEL };
      await expect(
        sut.getSearchSuggestions(authStub.user1, dto),
      ).resolves.toEqual([
        ...mockResult,
        { suggestion: null, startTime: null, endTime: null, assetCount: 0 },
      ]);
      expect(mocks.search.getCameraModels).toHaveBeenCalledWith([authStub.user1.user.id], dto);
    });

    it('should return search suggestions for camera lens model', async () => {
      const mockResult = [{ suggestion: '10-24mm', startTime: new Date('2023-01-01'), endTime: new Date('2023-01-02'), assetCount: 6 }];
      mocks.search.getCameraLensModels.mockResolvedValue([...mockResult]);
      mocks.partner.getAll.mockResolvedValue([]);

      const dto = { includeNull: false, type: SearchSuggestionType.CAMERA_LENS_MODEL };
      await expect(
        sut.getSearchSuggestions(authStub.user1, dto),
      ).resolves.toEqual(mockResult);
      expect(mocks.search.getCameraLensModels).toHaveBeenCalledWith([authStub.user1.user.id], dto);
    });

    it('should return search suggestions for preset time range', async () => {
      const mockResult = [{ suggestion: 'Last Week', startTime: new Date(), endTime: new Date(), assetCount: 20 }];
      mocks.search.getPresetTimeRanges.mockResolvedValue([...mockResult]);
      mocks.partner.getAll.mockResolvedValue([]);

      const dto = { includeNull: false, type: SearchSuggestionType.PRESET_TIME_RANGE };
      await expect(
        sut.getSearchSuggestions(authStub.user1, dto),
      ).resolves.toEqual(mockResult);
      expect(mocks.search.getPresetTimeRanges).toHaveBeenCalledWith([authStub.user1.user.id]);
    });

    it('should return empty list for library-name search suggestions', async () => {
      mocks.partner.getAll.mockResolvedValue([]);

      const dto = { includeNull: false, type: SearchSuggestionType.LIBRARY_NAME };
      await expect(
        sut.getSearchSuggestions(authStub.user1, dto),
      ).resolves.toEqual([]);
    });
  });

  describe('searchSmart', () => {
    beforeEach(() => {
      mocks.search.searchSmart.mockResolvedValue({ hasNextPage: false, items: [] });
      mocks.machineLearning.encodeText.mockResolvedValue('[1, 2, 3]');
    });

    it('should raise a BadRequestException if machine learning is disabled', async () => {
      mocks.systemMetadata.get.mockResolvedValue({
        machineLearning: { enabled: false },
      });

      await expect(sut.searchSmart(authStub.user1, { query: 'test' })).rejects.toThrowError(
        new BadRequestException('Smart search is not enabled'),
      );
    });

    it('should raise a BadRequestException if smart search is disabled', async () => {
      mocks.systemMetadata.get.mockResolvedValue({
        machineLearning: { clip: { enabled: false } },
      });

      await expect(sut.searchSmart(authStub.user1, { query: 'test' })).rejects.toThrowError(
        new BadRequestException('Smart search is not enabled'),
      );
    });

    it('should work', async () => {
      await sut.searchSmart(authStub.user1, { query: 'test' });

      expect(mocks.machineLearning.encodeText).toHaveBeenCalledWith(
        'test',
        expect.objectContaining({ modelName: expect.any(String) }),
      );
      expect(mocks.search.searchSmart).toHaveBeenCalledWith(
        { page: 1, size: 100 },
        { query: 'test', embedding: '[1, 2, 3]', userIds: [authStub.user1.user.id], visibility: 'not-locked' },
      );
    });

    it('should consider page and size parameters', async () => {
      await sut.searchSmart(authStub.user1, { query: 'test', page: 2, size: 50 });

      expect(mocks.machineLearning.encodeText).toHaveBeenCalledWith(
        'test',
        expect.objectContaining({ modelName: expect.any(String) }),
      );
      expect(mocks.search.searchSmart).toHaveBeenCalledWith(
        { page: 2, size: 50 },
        expect.objectContaining({ query: 'test', embedding: '[1, 2, 3]', userIds: [authStub.user1.user.id] }),
      );
    });

    it('should use clip model specified in config', async () => {
      mocks.systemMetadata.get.mockResolvedValue({
        machineLearning: { clip: { modelName: 'ViT-B-16-SigLIP__webli' } },
      });

      await sut.searchSmart(authStub.user1, { query: 'test' });

      expect(mocks.machineLearning.encodeText).toHaveBeenCalledWith(
        'test',
        expect.objectContaining({ modelName: 'ViT-B-16-SigLIP__webli' }),
      );
    });

    it('should use language specified in request', async () => {
      await sut.searchSmart(authStub.user1, { query: 'test', language: 'de' });

      expect(mocks.machineLearning.encodeText).toHaveBeenCalledWith(
        'test',
        expect.objectContaining({ language: 'de' }),
      );
    });
  });
});
