/**
 * The backend seam — custom REST + WebSocket preset. Same shape as the Supabase
 * preset (`{ auth, db, realtime, storage, client }`) so features importing
 * `@/shared/lib/backend` are source-compatible across both backbones. Activate
 * with `progix init --backend api`, which copies these files into
 * `src/shared/lib/backend/`.
 *
 * Unlike the BaaS preset, this code OWNS the token-refresh lifecycle (see
 * client.ts) and WebSocket reconnection (see realtime.ts).
 */
import { auth } from './auth';
import * as client from './client';
import { db } from './db';
import { realtime } from './realtime';
import { storage } from './storage';

export const backend = { auth, db, realtime, storage, client } as const;

export { auth, db, realtime, storage, client };

// Stable, backbone-agnostic types — identical names to the Supabase preset.
export type { BackendUser, BackendSession, AuthSubscription, BackendAuth } from './auth';
export type { BackendError, BackendDb, RequestOptions } from './db';
export type { RealtimeMessage, RealtimeSubscription, BackendRealtime } from './realtime';
export type { UploadResult, BackendStorage } from './storage';
