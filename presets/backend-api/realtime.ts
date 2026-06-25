import { env } from '@/shared/lib/env';

import { getAccessToken } from './client';

/**
 * Reconnecting WebSocket wrapper — same `subscribe`/`unsubscribe` surface as the
 * Supabase preset's realtime. WE own reconnection here: exponential backoff with
 * jitter, re-auth on each (re)connect, and channel re-subscription after a drop.
 *
 * Env: `EXPO_PUBLIC_WS_URL` (add to env.ts on activation — see README).
 */

// why: EXPO_PUBLIC_WS_URL is added to env.ts on activation; until then read it loosely.
const WS_URL = (env as unknown as { EXPO_PUBLIC_WS_URL: string }).EXPO_PUBLIC_WS_URL;

export type RealtimeMessage = {
  event: string;
  payload: unknown;
};

export type RealtimeSubscription = { unsubscribe: () => void };

type Handler = (message: RealtimeMessage) => void;

const MAX_BACKOFF_MS = 30_000;
const BASE_BACKOFF_MS = 500;

class RealtimeConnection {
  private socket: WebSocket | null = null;
  private readonly channels = new Map<string, Set<Handler>>();
  private attempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private closedByUs = false;

  private connect(): void {
    this.closedByUs = false;
    const token = getAccessToken();
    // Auth via query param — RN's WebSocket cannot set arbitrary headers.
    const url = token ? `${WS_URL}?access_token=${encodeURIComponent(token)}` : WS_URL;
    const socket = new WebSocket(url);
    this.socket = socket;

    socket.onopen = () => {
      this.attempt = 0;
      // Re-subscribe every known channel after a (re)connect.
      for (const channel of this.channels.keys()) this.send({ type: 'subscribe', channel });
    };

    socket.onmessage = (event) => {
      const frame = this.parse(event.data);
      if (!frame) return;
      const handlers = this.channels.get(frame.channel);
      if (!handlers) return;
      for (const handler of handlers) handler({ event: frame.event, payload: frame.payload });
    };

    socket.onclose = () => {
      this.socket = null;
      if (!this.closedByUs && this.channels.size > 0) this.scheduleReconnect();
    };

    socket.onerror = () => socket.close();
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    // Exponential backoff with full jitter, capped.
    const delay = Math.min(BASE_BACKOFF_MS * 2 ** this.attempt, MAX_BACKOFF_MS);
    const jittered = Math.random() * delay;
    this.attempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, jittered);
  }

  // why: wire frames are untyped JSON from the server; we validate the shape inline.
  private parse(data: unknown): { channel: string; event: string; payload: unknown } | null {
    if (typeof data !== 'string') return null;
    try {
      const json = JSON.parse(data);
      if (json && typeof json.channel === 'string' && typeof json.event === 'string') return json;
      return null;
    } catch {
      return null;
    }
  }

  private send(message: object): void {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message));
  }

  subscribe(channel: string, handler: Handler): RealtimeSubscription {
    let handlers = this.channels.get(channel);
    if (!handlers) {
      handlers = new Set();
      this.channels.set(channel, handlers);
      this.send({ type: 'subscribe', channel });
    }
    handlers.add(handler);

    // Open the socket lazily on the first subscription.
    if (!this.socket && !this.reconnectTimer) this.connect();

    return { unsubscribe: () => this.unsubscribe(channel, handler) };
  }

  unsubscribe(channel: string, handler?: Handler): void {
    const handlers = this.channels.get(channel);
    if (!handlers) return;
    if (handler) handlers.delete(handler);
    else handlers.clear();

    if (handlers.size === 0) {
      this.channels.delete(channel);
      this.send({ type: 'unsubscribe', channel });
    }

    // Nothing left to listen to — close and stop reconnecting.
    if (this.channels.size === 0) {
      this.closedByUs = true;
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      this.socket?.close();
      this.socket = null;
    }
  }
}

const connection = new RealtimeConnection();

export const realtime = {
  subscribe(channel: string, handler: Handler): RealtimeSubscription {
    return connection.subscribe(channel, handler);
  },
  unsubscribe(channel: string): void {
    connection.unsubscribe(channel);
  },
} as const;

export type BackendRealtime = typeof realtime;
