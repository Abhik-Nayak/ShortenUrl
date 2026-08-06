import type {
  Analytics,
  AuthResponse,
  CreateUrlBody,
  Paginated,
  ShortUrl,
  User,
} from './types';

const BASE = '/api/v1';
const TOKEN_KEY = 'shorten.token';

/** The one thing we keep in localStorage — the session token. */
export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: { path: string; message: string }[],
  ) {
    super(message);
  }

  /** Flattened field errors, ready to show under a form. */
  get fieldMessages(): string {
    return (this.details ?? []).map((d) => `${d.path}: ${d.message}`).join(', ');
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (res.status === 204) return undefined as T;

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    const message = payload?.message ?? `Request failed with status ${res.status}`;
    throw new ApiError(res.status, message, payload?.details);
  }

  return payload as T;
}

export const api = {
  register: (body: { email: string; password: string; name?: string }) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  me: () => request<{ user: User }>('/auth/me'),

  listUrls: (page = 1, pageSize = 20) =>
    request<Paginated<ShortUrl>>(`/urls?page=${page}&pageSize=${pageSize}`),

  createUrl: (body: CreateUrlBody) =>
    request<ShortUrl>('/urls', { method: 'POST', body: JSON.stringify(body) }),

  getUrl: (id: string) => request<ShortUrl>(`/urls/${id}`),

  updateUrl: (id: string, body: { originalUrl?: string; expiresAt?: string | null }) =>
    request<ShortUrl>(`/urls/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  deleteUrl: (id: string) => request<void>(`/urls/${id}`, { method: 'DELETE' }),

  analytics: (id: string) => request<Analytics>(`/urls/${id}/analytics`),
};
