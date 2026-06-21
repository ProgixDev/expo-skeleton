import { http } from './client';

export type { BackendError } from './client';

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  // why: request bodies are arbitrary JSON-serialisable shapes; callers type the response via <T>.
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

function withQuery(path: string, query?: RequestOptions['query']): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.append(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}${path.includes('?') ? '&' : '?'}${qs}` : path;
}

/**
 * Generic typed request, routed through the refresh-aware client. This is the
 * data primitive features build on (mirrors `db.from(...)` on the Supabase side,
 * but RESTful): `db.request<Task[]>('/tasks')`.
 */
export const db = {
  request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return http<T>(withQuery(path, options.query), {
      method: options.method,
      body: options.body,
      headers: options.headers,
      signal: options.signal,
    });
  },
} as const;

export type BackendDb = typeof db;
