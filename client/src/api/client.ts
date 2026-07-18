import type {
  ApiErrorBody,
  AuthResponse,
  CreateUrlRequest,
  LoginRequest,
  PaginatedUrls,
  RegisterRequest,
  UpdateUrlRequest,
  Url,
  UrlAnalytics,
} from './types'

const BASE = '/api/v1'
const TOKEN_KEY = 'shortenurl.token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

/** Error thrown for any non-2xx response, carrying the parsed server envelope. */
export class ApiError extends Error {
  status: number
  body?: ApiErrorBody

  constructor(status: number, body?: ApiErrorBody) {
    super(body?.message ?? `Request failed with status ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }

  /** Flattened validation details, if present. */
  get details(): string[] {
    return this.body?.details?.map((d) => `${d.path}: ${d.message}`) ?? []
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  auth = false
): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body) headers.set('Content-Type', 'application/json')
  if (auth) {
    const token = getToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers })

  if (res.status === 204) return undefined as T

  const isJson = res.headers.get('content-type')?.includes('application/json')
  const payload = isJson ? await res.json() : undefined

  if (!res.ok) {
    throw new ApiError(res.status, payload as ApiErrorBody)
  }

  return payload as T
}

export const api = {
  // Auth
  register: (data: RegisterRequest) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: LoginRequest) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // URLs (authenticated)
  listUrls: () => request<PaginatedUrls>('/urls', {}, true),

  createUrl: (data: CreateUrlRequest) =>
    request<Url>('/urls', { method: 'POST', body: JSON.stringify(data) }, true),

  getUrl: (id: string) => request<Url>(`/urls/${id}`, {}, true),

  updateUrl: (id: string, data: UpdateUrlRequest) =>
    request<Url>(
      `/urls/${id}`,
      { method: 'PUT', body: JSON.stringify(data) },
      true
    ),

  deleteUrl: (id: string) =>
    request<void>(`/urls/${id}`, { method: 'DELETE' }, true),

  getAnalytics: (id: string) =>
    request<UrlAnalytics>(`/urls/${id}/analytics`, {}, true),
}
