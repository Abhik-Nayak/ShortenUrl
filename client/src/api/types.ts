// Mirrors the server DTOs (server/src/dto).

export interface User {
  id: string
  email: string
  name?: string
  createdAt: string
}

export interface AuthResponse {
  user: User
  token: string
}

export interface RegisterRequest {
  email: string
  password: string
  name?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface Url {
  id: string
  originalUrl: string
  shortCode: string
  shortUrl: string
  createdAt: string
  expiresAt: string | null
  clicks: number
}

export interface PaginatedUrls {
  data: Url[]
  page: number
  pageSize: number
  total: number
}

export interface CreateUrlRequest {
  originalUrl: string
  customAlias?: string
  expiresAt?: string
}

export interface UpdateUrlRequest {
  originalUrl?: string
  expiresAt?: string
}

export interface UrlAnalytics {
  id: string
  shortCode: string
  totalClicks: number
  uniqueVisitors: number
  clicksByDay: { date: string; count: number }[]
  topReferrers: { referrer: string; count: number }[]
}

/** Error envelope returned by the server's global error handler. */
export interface ApiErrorBody {
  error: string
  message: string
  details?: { path: string; message: string }[]
}
