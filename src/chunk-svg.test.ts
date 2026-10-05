import { expect, test } from "bun:test";
import { renderChunkSvg } from "./chunk-svg.ts";
import type { Chunk } from "./session.ts";

const chunk: Chunk = {
  offset: 0,
  nextOffset: 1600,
  bottom: 1600,
  isComplete: false,
  title: 'Say "hi" & <bye>',
  viewport: { width: 400, height: 800, pixelRatio: 2 },
  screens: [
    {
      top: 0,
      imageId: "first",
      clickables: [
        { x: 10.4, y: 20.6, width: 100, height: 30, href: "https://example.com/a?b=1&c=2" },
        { x: 0, y: 100, width: 50, height: 50, href: null },
      ],
    },
    { top: 800, imageId: "second", clickables: [] },
  ],
};

const svg = renderChunkSvg(chunk, (imageId) => `/image/${imageId}`);

test("places each screen image at its scroll position", () => {
  expect(svg).toContain('<image href="/image/second" x="0" y="800" width="400" height="800"/>');
});

test("renders links as proxied anchors with rounded boxes", () => {
  expect(svg).toContain('<a href="/example.com/a?b=1&amp;c=2"><rect x="10" y="21" width="100" height="30"/></a>');
});

test("renders buttons as forwardable rects", () => {
  expect(svg).toContain('<rect class="button" x="0" y="100" width="50" height="50"/>');
});

test("escapes the title attribute", () => {
  expect(svg).toContain('data-title="Say &quot;hi&quot; &amp; &lt;bye>"');
});
