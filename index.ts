import { renderChunkSvg } from "./src/chunk-svg.ts";
import home from "./src/client/home.html";
import viewer from "./src/client/viewer.html";
import { SessionRegistry } from "./src/session-registry.ts";
import { toProxyPath, toTargetUrl } from "./src/target-url.ts";
import { parseViewport } from "./src/viewport.ts";

const PORT = 3001;
const IMAGE_CACHE_CONTROL = "private, max-age=3600, immutable";

const sessions = new SessionRegistry();

const badRequest = (message: string) => new Response(message, { status: 400 });
const notFound = () => new Response(null, { status: 404 });

const serveChunk = async (request: Request): Promise<Response> => {
  const params = new URL(request.url).searchParams;
  const sessionId = params.get("session");
  const targetUrl = toTargetUrl(params.get("path") ?? "");
  const viewport = parseViewport(params);
  const offset = Number(params.get("offset"));
  const isValidOffset = Number.isInteger(offset) && offset >= 0;
  if (!sessionId || !targetUrl || !viewport || !isValidOffset) return badRequest("Invalid chunk request");

  const session = sessions.getOrOpen(sessionId, targetUrl, viewport);
  try {
    const chunk = await session.captureChunk(offset);
    const svg = renderChunkSvg(chunk, (imageId) => `/__sitm/image/${sessionId}/${imageId}`);
    return new Response(Bun.gzipSync(svg), {
      headers: { "content-type": "image/svg+xml", "content-encoding": "gzip" },
    });
  } catch (error) {
    return new Response(`Could not render ${targetUrl}: ${error}`, { status: 502 });
  }
};

const forwardClick = async (request: Request): Promise<Response> => {
  const { session: sessionId, x, y } = await request.json();
  const isValidPoint = Number.isFinite(x) && Number.isFinite(y);
  if (!isValidPoint) return badRequest("Invalid click");

  const session = sessions.get(sessionId);
  if (!session) return notFound();
  const target = await session.click({ x, y });
  const isWebTarget = target?.startsWith("http://") || target?.startsWith("https://");
  return Response.json({ navigateTo: isWebTarget ? toProxyPath(target!) : null });
};

Bun.serve({
  port: PORT,
  routes: {
    "/": home,
    "/favicon.ico": notFound(),
    "/__sitm/chunk": { GET: serveChunk },
    "/__sitm/click": { POST: forwardClick },
    "/__sitm/close": {
      POST: (request) => {
        sessions.close(new URL(request.url).searchParams.get("session") ?? "");
        return new Response(null, { status: 204 });
      },
    },
    "/__sitm/image/:session/:image": async (request) => {
      const image = sessions.get(request.params.session)?.image(request.params.image);
      if (!image) return notFound();
      return new Response(await image, { headers: { "cache-control": IMAGE_CACHE_CONTROL } });
    },
    "/*": viewer,
  },
});

console.log(`svg-in-the-middle listening on http://localhost:${PORT}`);
