const MAX_VIEWPORT_SIZE = 16384;
const MAX_PIXEL_RATIO = 4;

export interface Viewport {
  width: number;
  height: number;
  pixelRatio: number;
}

export const parseViewport = (params: URLSearchParams): Viewport | null => {
  const viewport = {
    width: Number(params.get("width")),
    height: Number(params.get("height")),
    pixelRatio: Number(params.get("dpr")),
  };
  const isValidSize = (size: number) => Number.isInteger(size) && size > 0 && size <= MAX_VIEWPORT_SIZE;
  const isValidPixelRatio = viewport.pixelRatio > 0 && viewport.pixelRatio <= MAX_PIXEL_RATIO;
  return isValidSize(viewport.width) && isValidSize(viewport.height) && isValidPixelRatio ? viewport : null;
};
