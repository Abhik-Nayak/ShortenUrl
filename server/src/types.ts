/** Row shapes. These deliberately look like SQL rows so the Postgres swap is mechanical. */

export interface User {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string;
  createdAt: string;
}

export interface Url {
  id: string;
  userId: string;
  shortCode: string;
  originalUrl: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Click {
  id: string;
  urlId: string;
  clickedAt: string;
  referrer: string | null;
  userAgent: string | null;
  visitorHash: string;
}

export interface DbSchema {
  users: User[];
  urls: Url[];
  clicks: Click[];
}

/** What we hand back over HTTP — never includes passwordHash. */
export type PublicUser = Omit<User, 'passwordHash'>;

export interface UrlResponse extends Omit<Url, 'userId'> {
  shortUrl: string;
  clickCount: number;
}
