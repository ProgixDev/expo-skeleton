import { supabase } from '../supabase';

/** What `upload` resolves to. The API preset returns the same shape. */
export type UploadResult = {
  bucket: string;
  path: string;
};

export const storage = {
  /**
   * Upload to a bucket. `body` is whatever the platform fetch accepts as a blob
   * (Blob/ArrayBuffer/FormData) — RN gives you these from expo-file-system /
   * image pickers.
   */
  async upload(
    bucket: string,
    path: string,
    body: Blob | ArrayBuffer | ArrayBufferView | FormData,
    options?: { contentType?: string; upsert?: boolean },
  ): Promise<UploadResult> {
    const { data, error } = await supabase.storage.from(bucket).upload(path, body, {
      contentType: options?.contentType,
      upsert: options?.upsert ?? false,
    });
    if (error) throw error;
    return { bucket, path: data.path };
  },

  /** Time-limited URL for a private object. */
  async getSignedUrl(bucket: string, path: string, expiresInSeconds = 3600): Promise<string> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresInSeconds);
    if (error) throw error;
    return data.signedUrl;
  },

  /** Stable URL for a public bucket (no expiry, no auth). */
  getPublicUrl(bucket: string, path: string): string {
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  },
} as const;

export type BackendStorage = typeof storage;
