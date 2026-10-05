import type { Clickable } from "./page-agent.ts";
import type { Chunk, Screen } from "./session.ts";
import { toProxyPath } from "./target-url.ts";

const ATTRIBUTE_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", '"': "&quot;" };

const escapeAttribute = (value: string): string => {
  return value.replace(/[&<"]/g, (character) => ATTRIBUTE_ESCAPES[character]!);
};

const box = ({ x, y, width, height }: Clickable): string => {
  return `x="${Math.round(x)}" y="${Math.round(y)}" width="${Math.round(width)}" height="${Math.round(height)}"`;
};

const renderClickable = (clickable: Clickable): string => {
  if (clickable.href === null) return `<rect class="button" ${box(clickable)}/>`;
  return `<a href="${escapeAttribute(toProxyPath(clickable.href))}"><rect ${box(clickable)}/></a>`;
};

export const renderChunkSvg = (chunk: Chunk, imageHref: (imageId: string) => string): string => {
  const { width, height } = chunk.viewport;
  const renderImage = (screen: Screen) =>
    `<image href="${imageHref(screen.imageId)}" x="0" y="${screen.top}" width="${width}" height="${height}"/>`;
  const clickables = chunk.screens.flatMap((screen) => screen.clickables);
  const attributes = [
    `data-offset="${chunk.offset}"`,
    `data-next-offset="${chunk.nextOffset}"`,
    `data-bottom="${chunk.bottom}"`,
    `data-complete="${chunk.isComplete}"`,
    `data-title="${escapeAttribute(chunk.title)}"`,
  ].join(" ");
  return [
    `<svg xmlns="http://www.w3.org/2000/svg"><g ${attributes}>`,
    ...chunk.screens.map(renderImage),
    ...clickables.map(renderClickable),
    "</g></svg>",
  ].join("\n");
};
