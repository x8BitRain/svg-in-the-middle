import type { Viewport } from "./viewport.ts";

const AVIF_QUALITY = 1;


export const encodeScreenshot = (png: Buffer, viewport: Viewport): Promise<Blob> => {
  const clientPixelWidth = Math.round(viewport.width * viewport.pixelRatio);
  return new Bun.Image(png)
    .resize(clientPixelWidth, undefined, { withoutEnlargement: true })
    .avif({ quality: AVIF_QUALITY })
    .blob();
};
