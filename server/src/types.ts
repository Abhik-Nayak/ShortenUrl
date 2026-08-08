/**
 * Row shapes as the application sees them: camelCase, timestamps as ISO-8601
 * strings. The repositories map these to and from the snake_case Postgres
 * columns, so nothing above that layer deals in database naming.
 */

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

/** What we hand back over HTTP — never includes passwordHash. */
export type PublicUser = Omit<User, 'passwordHash'>;

export interface UrlResponse extends Omit<Url, 'userId'> {
  shortUrl: string;
  clickCount: number;
}
