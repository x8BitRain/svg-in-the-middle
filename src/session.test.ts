import { afterAll, describe, expect, test } from "bun:test";
import { Session } from "./session.ts";

const VIEWPORT = { width: 400, height: 300, pixelRatio: 1 };
const PAGE_HEIGHT = 1000;

const fixturePage = `<!doctype html>
<body style="margin:0">
  <header style="position:fixed;top:0;width:100%;height:40px;background:#333">
    <a href="/home" style="display:block;width:80px;height:40px">home</a>
  </header>
  <a id="deep" href="/deep" style="position:absolute;left:20px;top:450px;width:100px;height:30px">deep</a>
  <button id="toggle" style="position:absolute;left:20px;top:100px;width:100px;height:30px"
    onclick="document.body.dataset.toggled = 'yes'">toggle</button>
  <button id="go" style="position:absolute;left:20px;top:700px;width:100px;height:30px"
    onclick="location.href = '/elsewhere'">go</button>
  <div style="height:${PAGE_HEIGHT}px"></div>
</body>`;

const fixture = Bun.serve({
  port: 0,
  fetch: () => new Response(fixturePage, { headers: { "content-type": "text/html" } }),
});
const fixtureUrl = new URL(`http://localhost:${fixture.port}/`);

const openSession = (): Session => {
  return new Session(new Bun.WebView({ width: VIEWPORT.width, height: VIEWPORT.height }), fixtureUrl, VIEWPORT);
};

afterAll(() => fixture.stop());

describe("captureChunk", () => {
  const session = openSession();
  const firstChunk = session.captureChunk(0);
  const lastChunk = firstChunk.then((chunk) => session.captureChunk(chunk.nextOffset));
  afterAll(() => session.close());

  test("captures two screens per chunk", async () => {
    expect((await firstChunk).screens.map((screen) => screen.top)).toEqual([0, 300]);
  });

  test("records links in document coordinates", async () => {
    const clickables = (await firstChunk).screens.flatMap((screen) => screen.clickables);
    expect(clickables).toContainEqual({ x: 20, y: 450, width: 100, height: 30, href: `${fixtureUrl}deep` });
  });

  test("records buttons without an href", async () => {
    const clickables = (await firstChunk).screens.flatMap((screen) => screen.clickables);
    expect(clickables).toContainEqual({ x: 20, y: 100, width: 100, height: 30, href: null });
  });

  test("shows the fixed header only on the first screen", async () => {
    const homeLinks = (await firstChunk).screens.map((screen) =>
      screen.clickables.filter((clickable) => clickable.href?.endsWith("/home")).length,
    );
    expect(homeLinks).toEqual([1, 0]);
  });

  test("clamps the last screen to the page bottom", async () => {
    expect((await lastChunk).screens.at(-1)!.top).toBe(PAGE_HEIGHT - VIEWPORT.height);
  });

  test("marks the last chunk complete", async () => {
    expect((await lastChunk).isComplete).toBe(true);
  });

  test("encodes screen images as AVIF", async () => {
    const image = await session.image((await firstChunk).screens[0]!.imageId);
    expect(image?.type).toBe("image/avif");
  });
});

describe("click", () => {
  const session = openSession();
  afterAll(() => session.close());

  test("reports where a navigating button leads", async () => {
    expect(await session.click({ x: 70, y: 715 })).toBe(`${fixtureUrl}elsewhere`);
  });

  test("reports no navigation for a button that changes the page in place", async () => {
    expect(await session.click({ x: 70, y: 115 })).toBeNull();
  });
});
