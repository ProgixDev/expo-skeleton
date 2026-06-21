/**
 * The backend seam — the single door the whole app uses to reach the backbone.
 * Features import `{ backend }` and never touch `@supabase/supabase-js` (or any
 * future API client) directly. Swapping backbones is a folder swap: this dir is
 * one of two presets (presets/backend-supabase = this; presets/backend-api =
 * custom REST + WebSocket), both exposing the SAME shape below.
 *
 *   import { backend } from '@/shared/lib/backend';
 *   await backend.auth.signInWithPassword(email, password);
 */
import { auth } from './auth';
import { client, registerSupabaseAutoRefresh } from './client';
import { db } from './db';
import { realtime } from './realtime';
import { storage } from './storage';

export const backend = { auth, db, realtime, storage, client } as const;

// Named pieces + the auto-refresh registrar, for callers that want one slice.
export { auth, db, realtime, storage, client, registerSupabaseAutoRefresh };

// Stable, backbone-agnostic types features should depend on.
export type { BackendUser, BackendSession, AuthSubscription, BackendAuth } from './auth';
export type { BackendError, BackendDb } from './db';
export type { RealtimeMessage, RealtimeSubscription, BackendRealtime } from './realtime';
export type { UploadResult, BackendStorage } from './storage';
