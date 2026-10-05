const session = crypto.randomUUID();
const viewportWidth = document.documentElement.clientWidth;
const viewportHeight = innerHeight;
const prefetchDistance = viewportHeight / 2;

const page = document.querySelector<SVGSVGElement>("#page")!;
const loader = document.querySelector<HTMLElement>("#loader")!;
const status = document.querySelector<HTMLOutputElement>("#status")!;

let nextOffset = 0;
let isComplete = false;
let pending = Promise.resolve();

page.setAttribute("width", String(viewportWidth));

const enqueue = (task: () => Promise<void>) => {
  pending = pending
    .then(task)
    .catch((error) => {
      status.textContent = String(error);
    });
};

const fetchChunk = async (offset: number): Promise<SVGGElement> => {
  const params = new URLSearchParams({
    session,
    path: location.pathname + location.search,
    width: String(viewportWidth),
    height: String(viewportHeight),
    dpr: String(devicePixelRatio),
    offset: String(offset),
  });
  status.textContent = "Loading…";
  const response = await fetch(`/__sitm/chunk?${params}`);
  if (!response.ok) throw new Error(await response.text());
  const chunk = new DOMParser().parseFromString(await response.text(), "image/svg+xml");
  status.textContent = "";
  return document.importNode(chunk.documentElement.firstElementChild as SVGGElement, true);
};

const showChunk = (chunk: SVGGElement) => {
  page.append(chunk);
  page.setAttribute("height", chunk.dataset.bottom!);
  nextOffset = Number(chunk.dataset.nextOffset);
  isComplete = chunk.dataset.complete === "true";
  document.title = chunk.dataset.title || location.pathname.slice(1);
};

const isNearBottom = (): boolean => {
  return loader.getBoundingClientRect().top <= viewportHeight + prefetchDistance;
};

const loadMore = () => {
  enqueue(async () => {
    if (isComplete || !isNearBottom()) return;
    showChunk(await fetchChunk(nextOffset));
    loadMore();
  });
};

const rerenderVisibleChunk = async () => {
  const chunks = [...page.children] as SVGGElement[];
  const visibleOffset = chunks.map((chunk) => Number(chunk.dataset.offset)).findLast((offset) => offset <= scrollY) ?? 0;
  const freshChunk = await fetchChunk(visibleOffset);
  for (const chunk of chunks) if (Number(chunk.dataset.offset) >= visibleOffset) chunk.remove();
  showChunk(freshChunk);
  loadMore();
};

const forwardClick = async (event: MouseEvent) => {
  const response = await fetch("/__sitm/click", {
    method: "POST",
    body: JSON.stringify({ session, x: event.pageX, y: event.pageY }),
  });
  const { navigateTo } = (await response.json()) as { navigateTo: string | null };
  if (navigateTo) location.assign(navigateTo);
  else await rerenderVisibleChunk();
};

page.addEventListener("click", (event) => {
  const isButton = event.target instanceof SVGRectElement && event.target.classList.contains("button");
  if (isButton) enqueue(() => forwardClick(event));
});

new IntersectionObserver(loadMore, { rootMargin: `0px 0px ${prefetchDistance}px 0px` }).observe(loader);

addEventListener("pagehide", () => navigator.sendBeacon(`/__sitm/close?session=${session}`));
