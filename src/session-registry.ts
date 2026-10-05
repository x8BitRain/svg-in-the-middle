import { Session } from "./session.ts";
import type { Viewport } from "./viewport.ts";

const IDLE_TIMEOUT_MS = 2 * 60 * 1000;

const openSession = (targetUrl: URL, viewport: Viewport): Session => {
  const view = new Bun.WebView({ width: viewport.width, height: viewport.height });
  return new Session(view, targetUrl, viewport);
};

export class SessionRegistry {
  readonly #sessions = new Map<string, { session: Session; idleTimer: Timer }>();

  getOrOpen(sessionId: string, targetUrl: URL, viewport: Viewport): Session {
    const session = this.#sessions.get(sessionId)?.session ?? openSession(targetUrl, viewport);
    this.#touch(sessionId, session);
    return session;
  }

  get(sessionId: string): Session | undefined {
    const session = this.#sessions.get(sessionId)?.session;
    if (session) this.#touch(sessionId, session);
    return session;
  }

  close(sessionId: string) {
    const entry = this.#sessions.get(sessionId);
    if (!entry) return;
    clearTimeout(entry.idleTimer);
    entry.session.close();
    this.#sessions.delete(sessionId);
  }

  #touch(sessionId: string, session: Session) {
    clearTimeout(this.#sessions.get(sessionId)?.idleTimer);
    const idleTimer = setTimeout(() => this.close(sessionId), IDLE_TIMEOUT_MS);
    this.#sessions.set(sessionId, { session, idleTimer });
  }
}
