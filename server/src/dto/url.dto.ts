/** Request/response DTOs for URL endpoints. */

export interface CreateUrlRequestDto {
  originalUrl: string;
  customAlias?: string;
  expiresAt?: string;
}

export interface UpdateUrlRequestDto {
  originalUrl?: string;
  expiresAt?: string;
}

export interface UrlResponseDto {
  id: string;
  originalUrl: string;
  shortCode: string;
  shortUrl: string;
  createdAt: string;
  expiresAt: string | null;
  clicks: number;
}

export interface PaginatedUrlsDto {
  data: UrlResponseDto[];
  page: number;
  pageSize: number;
  total: number;
}

export interface UrlAnalyticsDto {
  id: string;
  shortCode: string;
  totalClicks: number;
  uniqueVisitors: number;
  clicksByDay: { date: string; count: number }[];
  topReferrers: { referrer: string; count: number }[];
}
