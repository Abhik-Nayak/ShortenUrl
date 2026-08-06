export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ShortUrl {
  id: string;
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  clickCount: number;
}

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface Analytics {
  id: string;
  shortCode: string;
  originalUrl: string;
  totalClicks: number;
  uniqueVisitors: number;
  clicksByDay: { date: string; count: number }[];
  topReferrers: { referrer: string; count: number }[];
}

export interface CreateUrlBody {
  originalUrl: string;
  customAlias?: string;
  expiresAt?: string | null;
}
