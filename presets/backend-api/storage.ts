import { env } from '@/shared/lib/env';

import { http } from './client';

/**
 * File storage over the custom API — same `upload` / `getSignedUrl` surface as
 * the Supabase preset. We use a presigned-URL flow: ask the API where to PUT the
 * bytes, then upload straight to that URL (keeps large blobs off the app server).
 */

export type UploadResult = {
  bucket: string;
  path: string;
};

type PresignResponse = {
  uploadUrl: string;
  path: string;
  // Headers the storage backend (e.g. S3) requires on the PUT.
  headers?: Record<string, string>;
};

export const storage = {
  async upload(
    bucket: string,
    path: string,
    body: Blob | ArrayBuffer | ArrayBufferView | FormData,
    options?: { contentType?: string; upsert?: boolean },
  ): Promise<UploadResult> {
    // 1. Ask our API for a presigned destination (refresh-aware, authed).
    const presign = await http<PresignResponse>('/storage/presign', {
      method: 'POST',
      body: { bucket, path, contentType: options?.contentType, upsert: options?.upsert ?? false },
    });

    // 2. Upload the bytes directly to the presigned URL (not through our API).
    const res = await fetch(presign.uploadUrl, {
      method: 'PUT',
      headers: {
        ...(options?.contentType ? { 'Content-Type': options.contentType } : {}),
        ...presign.headers,
      },
      // why: fetch body accepts these blob-ish types but its lib.dom typing is narrower.
      body: body as BodyInit,
    });
    if (!res.ok) throw new Error(`Upload failed (${res.status})`);

    return { bucket, path: presign.path };
  },

  /** Time-limited URL for a private object, minted by the API. */
  async getSignedUrl(bucket: string, path: string, expiresInSeconds = 3600): Promise<string> {
    const { url } = await http<{ url: string }>('/storage/signed-url', {
      method: 'POST',
      body: { bucket, path, expiresIn: expiresInSeconds },
    });
    return url;
  },

  /** Stable URL for a public object (no expiry, no auth) — convention-based. */
  getPublicUrl(bucket: string, path: string): string {
    // Mirrors the Supabase preset's public-bucket convention: <api>/storage/public/<bucket>/<path>.
    return `${env.EXPO_PUBLIC_API_URL}/storage/public/${bucket}/${path.replace(/^\/+/, '')}`;
  },
} as const;

export type BackendStorage = typeof storage;
