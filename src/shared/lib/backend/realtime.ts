import type { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from '../supabase';

/** Payload delivered to a realtime handler. Kept loose so the API preset matches. */
export type RealtimeMessage = {
  event: string;
  payload: unknown;
};

export type RealtimeSubscription = { unsubscribe: () => void };

// Track channels by name so `unsubscribe(channel)` can tear the right one down.
const channels = new Map<string, RealtimeChannel>();

export const realtime = {
  /**
   * Subscribe to a named channel. Over Supabase realtime we forward broadcast
   * events; swap to `.on('postgres_changes', …)` per feature if you need CDC.
   */
  subscribe(channel: string, handler: (message: RealtimeMessage) => void): RealtimeSubscription {
    const existing = channels.get(channel);
    const ch = existing ?? supabase.channel(channel);
    ch.on('broadcast', { event: '*' }, (msg) => {
      handler({ event: msg.event, payload: msg.payload });
    });
    if (!existing) {
      ch.subscribe();
      channels.set(channel, ch);
    }
    return { unsubscribe: () => this.unsubscribe(channel) };
  },

  async unsubscribe(channel: string): Promise<void> {
    const ch = channels.get(channel);
    if (!ch) return;
    channels.delete(channel);
    await supabase.removeChannel(ch);
  },
} as const;

export type BackendRealtime = typeof realtime;
