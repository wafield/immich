import { AdaptiveImageLoader, type QualityList } from '#lib/utils/adaptive-image-loader.svelte.ts';

function createQualityList(overrides?: {
  onAfterLoad?: Record<string, (loader: AdaptiveImageLoader) => void>;
  onAfterError?: Record<string, (loader: AdaptiveImageLoader) => void>;
}): QualityList {
  return [
    {
      quality: 'thumbnail',
      url: '/thumbnail.jpg',
      onAfterLoad: overrides?.onAfterLoad?.thumbnail,
      onAfterError: overrides?.onAfterError?.thumbnail,
    },
    {
      quality: 'preview',
      url: '/preview.jpg',
      onAfterLoad: overrides?.onAfterLoad?.preview,
      onAfterError: overrides?.onAfterError?.preview,
    },
    {
      quality: 'original',
      url: '/original.jpg',
      onAfterLoad: overrides?.onAfterLoad?.original,
      onAfterError: overrides?.onAfterError?.original,
    },
  ];
}

describe('AdaptiveImageLoader', () => {
  it('thumbnail load triggers preview via onAfterLoad', () => {
    const triggerSpy = vi.fn();
    const qualityList = createQualityList({
      onAfterLoad: {
        thumbnail: (loader) => {
          triggerSpy();
          loader.trigger('preview');
        },
      },
    });
    const loader = new AdaptiveImageLoader(qualityList);

    loader.onLoad('thumbnail');

    expect(triggerSpy).toHaveBeenCalledOnce();
    expect(loader.status.urls.preview).toBe('/preview.jpg');
  });

  it('thumbnail error triggers preview via onAfterError', () => {
    const qualityList = createQualityList({
      onAfterError: {
        thumbnail: (loader) => loader.trigger('preview'),
      },
    });
    const loader = new AdaptiveImageLoader(qualityList);

    loader.onError('thumbnail');

    expect(loader.status.urls.preview).toBe('/preview.jpg');
  });

  describe('progress tracking', () => {
    it('initializes progress at 0', () => {
      const loader = new AdaptiveImageLoader(createQualityList());
      expect(loader.status.progress).toBe(0);
    });

    it('updates progress via onProgress', () => {
      const loader = new AdaptiveImageLoader(createQualityList());
      loader.onProgress('preview', 45);
      expect(loader.status.progress).toBe(45);
    });

    it('clamps progress between 0 and 100', () => {
      const loader = new AdaptiveImageLoader(createQualityList());
      loader.onProgress('preview', 150);
      expect(loader.status.progress).toBe(100);
      loader.onProgress('preview', -20);
      expect(loader.status.progress).toBe(0);
    });

    it('sets progress to 100 on onLoad', () => {
      const loader = new AdaptiveImageLoader(createQualityList());
      loader.onProgress('thumbnail', 50);
      loader.onLoad('thumbnail');
      expect(loader.status.progress).toBe(100);
    });

    it('sets progress to 0 on onError', () => {
      const loader = new AdaptiveImageLoader(createQualityList());
      loader.onProgress('preview', 75);
      loader.onError('preview');
      expect(loader.status.progress).toBe(0);
    });

    it('tracks download progress from Content-Length header as chunks arrive', async () => {
      const chunks = [new Uint8Array(25), new Uint8Array(25), new Uint8Array(50)];
      let chunkIndex = 0;

      const stream = new ReadableStream({
        pull(controller) {
          if (chunkIndex < chunks.length) {
            controller.enqueue(chunks[chunkIndex++]);
          } else {
            controller.close();
          }
        },
      });

      const mockResponse = new Response(stream, {
        headers: {
          'content-length': '100',
          'content-type': 'image/jpeg',
        },
      });

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

      const loader = new AdaptiveImageLoader(createQualityList());
      loader.trigger('preview');

      // Wait for stream to finish downloading
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('/preview.jpg'), expect.any(Object));
      expect(loader.status.progress).toBe(100);

      fetchSpy.mockRestore();
    });

    it('triggers downloadWithProgress when start is called', () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise(() => {}));
      const mockImageLoader = vi.fn().mockReturnValue(() => {});

      const loader = new AdaptiveImageLoader(createQualityList(), undefined, mockImageLoader);
      loader.start();

      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('/thumbnail.jpg'), expect.any(Object));
      fetchSpy.mockRestore();
    });
  });
});
