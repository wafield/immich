import type { LoadImageFunction } from '$lib/actions/image-loader.svelte';
import { cancelImageUrl } from '$lib/utils/sw-messaging';

export type ImageQuality = 'thumbnail' | 'preview' | 'original';

export type ImageStatus = 'unloaded' | 'success' | 'error';

export type ImageLoaderStatus = {
  urls: Record<ImageQuality, string | undefined>;
  quality: Record<ImageQuality, ImageStatus>;
  started: boolean;
  hasError: boolean;
  progress: number;
};

type ImageLoaderCallbacks = {
  onUrlChange?: (url: string) => void;
  onImageReady?: () => void;
  onError?: () => void;
};

export type QualityConfig = {
  url: string;
  quality: ImageQuality;
  onAfterLoad?: (loader: AdaptiveImageLoader) => void;
  onAfterError?: (loader: AdaptiveImageLoader) => void;
};

export type QualityList = [
  QualityConfig & { quality: 'thumbnail' },
  QualityConfig & { quality: 'preview' },
  QualityConfig & { quality: 'original' },
];

export class AdaptiveImageLoader {
  private destroyFunctions: (() => void)[] = [];
  private qualityConfigs: Record<ImageQuality, QualityConfig>;
  private highestLoadedQualityIndex = -1;
  private destroyed = false;
  private downloadAbortController?: AbortController;

  status = $state<ImageLoaderStatus>({
    started: false,
    hasError: false,
    urls: { thumbnail: undefined, preview: undefined, original: undefined },
    quality: { thumbnail: 'unloaded', preview: 'unloaded', original: 'unloaded' },
    progress: 0,
  });

  constructor(
    private readonly qualityList: QualityList,
    private readonly callbacks?: ImageLoaderCallbacks,
    private readonly imageLoader?: LoadImageFunction,
  ) {
    this.qualityConfigs = {
      thumbnail: qualityList[0],
      preview: qualityList[1],
      original: qualityList[2],
    };
    this.status.urls.thumbnail = qualityList[0].url;
  }

  start() {
    if (!this.imageLoader) {
      throw new Error('Start requires imageLoader to be specified');
    }

    void this.downloadWithProgress('thumbnail', this.qualityList[0].url);
    this.destroyFunctions.push(
      this.imageLoader(
        this.qualityList[0].url,
        () => this.onLoad('thumbnail'),
        () => this.onError('thumbnail'),
        () => this.onStart('thumbnail'),
      ),
    );
  }

  onStart(_: ImageQuality) {
    if (this.destroyed) {
      return;
    }
    this.status.started = true;
  }

  onProgress(_: ImageQuality, progress: number) {
    if (this.destroyed) {
      return;
    }
    this.status.progress = Math.min(100, Math.max(0, Math.round(progress)));
  }

  onLoad(quality: ImageQuality) {
    if (this.destroyed) {
      return;
    }

    const config = this.qualityConfigs[quality];

    // eslint-disable-next-line unicorn/no-computed-property-existence-check
    if (!this.status.urls[quality]) {
      return;
    }

    const index = this.qualityList.indexOf(config);
    if (index <= this.highestLoadedQualityIndex) {
      return;
    }

    this.highestLoadedQualityIndex = index;
    this.status.quality[quality] = 'success';
    this.status.progress = 100;
    this.callbacks?.onUrlChange?.(this.qualityConfigs[quality].url);
    this.callbacks?.onImageReady?.();

    config.onAfterLoad?.(this);
  }

  onError(quality: ImageQuality) {
    if (this.destroyed) {
      return;
    }

    const config = this.qualityConfigs[quality];

    this.status.hasError = true;
    this.status.quality[quality] = 'error';
    this.status.urls[quality] = undefined;
    this.status.progress = 0;
    this.callbacks?.onError?.();

    config.onAfterError?.(this);
  }

  private async downloadWithProgress(quality: ImageQuality, url: string) {
    if (!url || typeof fetch !== 'function') {
      return;
    }

    this.downloadAbortController?.abort();
    const controller = new AbortController();
    this.downloadAbortController = controller;

    this.onProgress(quality, 0);

    try {
      const targetUrl = (() => {
        try {
          return new URL(
            url,
            typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'http://localhost',
          ).href;
        } catch {
          return url;
        }
      })();

      const response = await fetch(targetUrl, { signal: controller.signal });
      if (!response.ok) {
        return;
      }

      const contentLengthHeader = response.headers?.get('content-length');
      const totalBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;

      if (!response.body) {
        if (!controller.signal.aborted && !this.destroyed) {
          this.onProgress(quality, 100);
        }
        return;
      }

      const reader = response.body.getReader();
      let loadedBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        if (value) {
          loadedBytes += value.length;
          if (totalBytes > 0 && !controller.signal.aborted && !this.destroyed) {
            const percentage = Math.min(100, Math.round((loadedBytes / totalBytes) * 100));
            this.onProgress(quality, percentage);
          }
        }
      }

      if (!controller.signal.aborted && !this.destroyed) {
        this.onProgress(quality, 100);
      }
    } catch {
      // Ignore network errors or aborted fetches
    }
  }

  trigger(quality: ImageQuality) {
    if (this.destroyed) {
      return false;
    }

    const url = this.qualityConfigs[quality].url;
    if (!url) {
      this.qualityConfigs[quality].onAfterError?.(this);
      return false;
    }

    // eslint-disable-next-line unicorn/no-computed-property-existence-check
    if (this.status.urls[quality]) {
      return true;
    }

    this.status.hasError = false;
    this.status.urls[quality] = url;
    void this.downloadWithProgress(quality, url);
    if (this.imageLoader) {
      this.destroyFunctions.push(
        this.imageLoader(
          url,
          () => this.onLoad(quality),
          () => this.onError(quality),
          () => this.onStart(quality),
        ),
      );
    }
    return false;
  }

  destroy() {
    this.destroyed = true;
    this.downloadAbortController?.abort();
    if (this.imageLoader) {
      for (const destroy of this.destroyFunctions) {
        destroy();
      }
      return;
    }

    for (const config of Object.values(this.qualityConfigs)) {
      cancelImageUrl(config.url);
    }
  }
}
