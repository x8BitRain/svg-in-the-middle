export interface Clickable {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Absolute target URL for links; `null` for buttons, whose clicks are forwarded. */
  href: string | null;
}

export interface PreparedScreen {
  scrollY: number;
  scrollHeight: number;
  title: string;
  clickables: Clickable[];
}

export interface PageAgent {
  prepareScreen(top: number): Promise<PreparedScreen>;
  takeNavigationTarget(): Promise<string | null>;
}

export const installPageAgent = (): PageAgent => {
  const host = window as Window & { __svgInTheMiddle?: PageAgent };
  if (host.__svgInTheMiddle) return host.__svgInTheMiddle;

  const PINNED_ATTRIBUTE = "data-svg-in-the-middle-pinned";
  const CLICKABLE_SELECTOR = [
    "a[href]",
    "button",
    "summary",
    "input[type=submit]",
    "input[type=button]",
    "[role=button]",
    "[role=link]",
    "[role=tab]",
    "[role=menuitem]",
  ].join(",");

  const style = document.createElement("style");
  style.textContent = `
    [${PINNED_ATTRIBUTE}] { visibility: hidden !important; }
    html { scrollbar-width: none; }
    ::-webkit-scrollbar { display: none; }
  `;
  document.documentElement.append(style);

  let navigationTarget: string | null = null;

  navigation.addEventListener("navigate", (event) => {
    navigationTarget = event.destination.url;
    if (event.cancelable) event.preventDefault();
  });

  const nextFrames = () =>
    new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

  const waitForQuiet = (): Promise<void> => {
    const QUIET_WINDOW_MS = 300;
    const SETTLE_CAP_MS = 3000;
    return new Promise((resolve) => {
      let quietTimer: ReturnType<typeof setTimeout> | undefined;
      const restartQuietWindow = () => {
        clearTimeout(quietTimer);
        quietTimer = setTimeout(finish, QUIET_WINDOW_MS);
      };
      const mutations = new MutationObserver(restartQuietWindow);
      const responses = new PerformanceObserver(restartQuietWindow);
      const finish = () => {
        clearTimeout(quietTimer);
        clearTimeout(capTimer);
        mutations.disconnect();
        responses.disconnect();
        resolve();
      };
      const capTimer = setTimeout(finish, SETTLE_CAP_MS);
      mutations.observe(document, { subtree: true, childList: true, characterData: true });
      responses.observe({ type: "resource" });
      restartQuietWindow();
    });
  };

  const isPinned = (element: Element): boolean => {
    const { position, top } = getComputedStyle(element);
    if (position === "fixed") return true;
    if (position !== "sticky") return false;
    return Math.abs(element.getBoundingClientRect().top - parseFloat(top)) < 1;
  };

  const setPinnedHidden = (isHidden: boolean) => {
    for (const element of document.querySelectorAll(`[${PINNED_ATTRIBUTE}]`)) element.removeAttribute(PINNED_ATTRIBUTE);
    if (!isHidden) return;
    for (const element of document.querySelectorAll("body *")) {
      if (isPinned(element)) element.setAttribute(PINNED_ATTRIBUTE, "");
    }
  };

  const linkHref = (element: Element): string | null => {
    if (!(element instanceof HTMLAnchorElement)) return null;
    const isHashLink = element.getAttribute("href")?.startsWith("#");
    const isWebLink = element.protocol === "http:" || element.protocol === "https:";
    return isWebLink && !isHashLink ? element.href : null;
  };

  // pretty sure this doesnt work
  const isTopmost = (element: Element, rect: DOMRect): boolean => {
    const visibleTop = Math.max(rect.top, 0);
    const visibleBottom = Math.min(rect.bottom, innerHeight);
    const hit = document.elementFromPoint(rect.left + rect.width / 2, (visibleTop + visibleBottom) / 2);
    return hit !== null && element.contains(hit);
  };

  const getClickable = (top: number): Clickable[] => {
    const bottom = scrollY + innerHeight;
    const clickables: Clickable[] = [];
    for (const element of document.querySelectorAll(CLICKABLE_SELECTOR)) {
      const rect = element.getBoundingClientRect();
      const documentTop = rect.top + scrollY;
      const isOwnedByScreen = documentTop >= top && documentTop < bottom;
      if (!isOwnedByScreen || rect.width === 0 || rect.height === 0 || !isTopmost(element, rect)) continue;
      clickables.push({
        x: rect.left + scrollX,
        y: documentTop,
        width: rect.width,
        height: rect.height,
        href: linkHref(element),
      });
    }
    return clickables;
  };

  const agent: PageAgent = {
    async prepareScreen(top) {
      scrollTo(0, top);
      await waitForQuiet();
      setPinnedHidden(scrollY > 0);
      await nextFrames();
      return {
        scrollY,
        scrollHeight: document.documentElement.scrollHeight,
        title: document.title,
        clickables: getClickable(top),
      };
    },
    async takeNavigationTarget() {
      await nextFrames();
      const target = navigationTarget;
      navigationTarget = null;
      return target;
    },
  };
  host.__svgInTheMiddle = agent;
  return agent;
};
