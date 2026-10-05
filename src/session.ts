import { encodeScreenshot } from "./avif.ts";
import { installPageAgent, type Clickable, type PageAgent } from "./page-agent.ts";
import type { Viewport } from "./viewport.ts";

const SCREENS_PER_CHUNK = 2;

export interface Screen {
  top: number;
  imageId: string;
  clickables: Clickable[];
}

export interface Chunk {
  offset: number;
  nextOffset: number;
  bottom: number;
  isComplete: boolean;
  title: string;
  viewport: Viewport;
  screens: Screen[];
}

export interface Point {
  x: number;
  y: number;
}

export class Session {
  readonly #view: Bun.WebView;
  readonly #viewport: Viewport;
  readonly #images = new Map<string, Promise<Blob>>();
  readonly #loaded: Promise<void>;
  #queue: Promise<unknown> = Promise.resolve();

  constructor(view: Bun.WebView, targetUrl: URL, viewport: Viewport) {
    this.#view = view;
    this.#viewport = viewport;
    this.#loaded = view.navigate(targetUrl.href);
  }

  captureChunk(offset: number): Promise<Chunk> {
    return this.#serialize(async () => {
      const chunk: Chunk = {
        offset,
        nextOffset: offset,
        bottom: offset,
        isComplete: false,
        title: "",
        viewport: this.#viewport,
        screens: [],
      };
      while (chunk.screens.length < SCREENS_PER_CHUNK && !chunk.isComplete) {
        const prepared = await this.#runAgent("prepareScreen", chunk.nextOffset);
        chunk.screens.push({
          top: prepared.scrollY,
          imageId: this.#captureImage(await this.#view.screenshot({ encoding: "buffer" })),
          clickables: prepared.clickables,
        });
        chunk.title = prepared.title;
        chunk.bottom = prepared.scrollY + this.#viewport.height;
        chunk.nextOffset += this.#viewport.height;
        chunk.isComplete = chunk.nextOffset >= prepared.scrollHeight;
      }
      return chunk;
    });
  }

  click(point: Point): Promise<string | null> {
    return this.#serialize(async () => {
      const isOnFirstScreen = point.y < this.#viewport.height;
      const top = isOnFirstScreen ? 0 : point.y - this.#viewport.height / 2;
      const { scrollY } = await this.#runAgent("prepareScreen", top);
      const navigated = new Promise<string>((resolve) => (this.#view.onNavigated = resolve));
      await this.#view.click(point.x, point.y - scrollY);
      const target = await Promise.race([this.#runAgent("takeNavigationTarget"), navigated]);
      this.#view.onNavigated = null;
      return target;
    });
  }

  image(imageId: string): Promise<Blob> | undefined {
    return this.#images.get(imageId);
  }

  close() {
    this.#view.close();
    this.#images.clear();
  }

  #serialize<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.#queue.then(() => this.#loaded).then(operation);
    this.#queue = result.catch(() => {});
    return result;
  }

  #runAgent<Method extends keyof PageAgent>(
    method: Method,
    ...args: Parameters<PageAgent[Method]>
  ): ReturnType<PageAgent[Method]> {
    const script = `(${installPageAgent})().${method}(...${JSON.stringify(args)})`;
    return this.#view.evaluate(script) as ReturnType<PageAgent[Method]>;
  }

  #captureImage(png: Buffer): string {
    const imageId = crypto.randomUUID();
    this.#images.set(imageId, encodeScreenshot(png, this.#viewport));
    return imageId;
  }
}
