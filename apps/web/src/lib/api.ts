/** Cliente HTTP: cookies de sesión + token CSRF + envelope de error. */

const API_BASE = '/api/v1';

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export class ApiException extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiException';
    this.status = status;
    this.code = body.code;
    this.details = body.details;
  }
}

let csrfToken: string | null = null;

async function fetchCsrf(): Promise<string> {
  const res = await fetch(`${API_BASE}/csrf`, { credentials: 'include' });
  const data = (await res.json()) as { csrfToken: string };
  csrfToken = data.csrfToken;
  return csrfToken;
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const mutating = method !== 'GET';

  const send = async (): Promise<Response> => {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (mutating) headers['x-csrf-token'] = csrfToken ?? (await fetchCsrf());
    return fetch(`${API_BASE}${path}`, {
      method,
      credentials: 'include',
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  let res = await send();

  // Si el token CSRF caducó (p. ej. tras regenerar la sesión), refresca y reintenta una vez.
  if (mutating && res.status === 403) {
    csrfToken = null;
    csrfToken = await fetchCsrf();
    res = await send();
  }

  if (res.status === 204) return undefined as T;

  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const errorBody =
      (data as { error?: ApiErrorBody })?.error ??
      ({ code: 'UNKNOWN', message: 'Error de red' } satisfies ApiErrorBody);
    throw new ApiException(res.status, errorBody);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string): Promise<T> => request<T>('GET', path),
  post: <T>(path: string, body?: unknown): Promise<T> => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown): Promise<T> => request<T>('PATCH', path, body),
  del: <T>(path: string): Promise<T> => request<T>('DELETE', path),
};
