// Coordinate spaces used throughout the viewer:
//
// "Normalized": 0–1 range, (0,0) = top-left, (1,1) = bottom-right. Resolution-independent.
//   Example: OCR coordinates, or face coords after dividing by metadata dimensions.
//
// "Content": pixel position within the container after scaling (scaleToFit/scaleToCover)
//   and centering. Used for DOM overlay positioning (face boxes, OCR text).
//
// "Natural": pixel position in the original full-resolution image file (e.g. 4000×3000).
//   Used when cropping or drawing on the source image.
//
// "Metadata pixel space": coordinates from face detection / OCR models, in pixels relative
//   to face.imageWidth/imageHeight. Divide by those dimensions to get normalized coords.

export type Point = {
  x: number;
  y: number;
};

export type Size = {
  width: number;
  height: number;
};

export type ContentMetrics = {
  contentWidth: number;
  contentHeight: number;
  offsetX: number;
  offsetY: number;
};

const isMeasurable = (dimensions: Size) => dimensions.width > 0 && dimensions.height > 0;

export const scaleToCover = (dimensions: Size, container: Size): Size => {
  if (!isMeasurable(dimensions)) {
    return { width: 0, height: 0 };
  }
  const scaleX = container.width / dimensions.width;
  const scaleY = container.height / dimensions.height;
  const scale = Math.max(scaleX, scaleY);
  return {
    width: dimensions.width * scale,
    height: dimensions.height * scale,
  };
};

export const getScaleFactor = (dimensions: Size, container: Size): number => {
  if (!isMeasurable(dimensions) || !isMeasurable(container)) {
    return 0;
  }
  const scaleX = container.width / dimensions.width;
  const scaleY = container.height / dimensions.height;
  const scale = Math.min(scaleX, scaleY);
  return Number.isFinite(scale) ? scale : 0;
};

export const getZoomPercentage = (dimensions: Size, container: Size, zoom = 1): number => {
  const scale = getScaleFactor(dimensions, container);
  return Math.round(scale * zoom * 100);
};

export const getZoomForPercentage = (dimensions: Size, container: Size, targetPercentage = 100): number => {
  const scale = getScaleFactor(dimensions, container);
  if (scale <= 0) {
    return 1;
  }
  return targetPercentage / (scale * 100);
};

export const getScaleTo100Zoom = (dimensions: Size, container: Size): number => {
  return getZoomForPercentage(dimensions, container, 100);
};

export const scaleToFit = (dimensions: Size, container: Size): Size => {
  const scale = getScaleFactor(dimensions, container);
  if (scale === 0) {
    return { width: 0, height: 0 };
  }
  return {
    width: dimensions.width * scale,
    height: dimensions.height * scale,
  };
};

const getElementSize = (element: HTMLImageElement | HTMLVideoElement): Size => {
  if (element instanceof HTMLVideoElement) {
    return { width: element.clientWidth, height: element.clientHeight };
  }
  return { width: element.width, height: element.height };
};

export const getNaturalSize = (element: HTMLImageElement | HTMLVideoElement): Size => {
  if (element instanceof HTMLVideoElement) {
    return { width: element.videoWidth, height: element.videoHeight };
  }
  return { width: element.naturalWidth, height: element.naturalHeight };
};

export const getContentMetrics = (element: HTMLImageElement | HTMLVideoElement): ContentMetrics => {
  const natural = getNaturalSize(element);
  const client = getElementSize(element);
  const { width: contentWidth, height: contentHeight } = scaleToFit(natural, client);
  return {
    contentWidth,
    contentHeight,
    offsetX: (client.width - contentWidth) / 2,
    offsetY: (client.height - contentHeight) / 2,
  };
};

export function mapNormalizedToContent(point: Point, sizeOrMetrics: Size | ContentMetrics): Point {
  if ('contentWidth' in sizeOrMetrics) {
    return {
      x: point.x * sizeOrMetrics.contentWidth + sizeOrMetrics.offsetX,
      y: point.y * sizeOrMetrics.contentHeight + sizeOrMetrics.offsetY,
    };
  }
  return {
    x: point.x * sizeOrMetrics.width,
    y: point.y * sizeOrMetrics.height,
  };
}

export type Rect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export function mapNormalizedRectToContent(
  topLeft: Point,
  bottomRight: Point,
  sizeOrMetrics: Size | ContentMetrics,
): Rect {
  const tl = mapNormalizedToContent(topLeft, sizeOrMetrics);
  const br = mapNormalizedToContent(bottomRight, sizeOrMetrics);
  return {
    top: tl.y,
    left: tl.x,
    width: br.x - tl.x,
    height: br.y - tl.y,
  };
}
