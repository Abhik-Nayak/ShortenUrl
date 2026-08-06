import { randomUUID } from 'node:crypto';
import { store } from '../db/jsonStore.js';
import type { Url } from '../types.js';

export interface CreateUrlInput {
  userId: string;
  shortCode: string;
  originalUrl: string;
  expiresAt: string | null;
}

export interface UpdateUrlInput {
  originalUrl?: string;
  expiresAt?: string | null;
}

export const urlRepository = {
  findByShortCode(shortCode: string): Promise<Url | null> {
    return store.read((db) => db.urls.find((u) => u.shortCode === shortCode) ?? null);
  },

  /** Scoped to the owner — another user's id must look like it doesn't exist. */
  findByIdForUser(id: string, userId: string): Promise<Url | null> {
    return store.read((db) => db.urls.find((u) => u.id === id && u.userId === userId) ?? null);
  },

  listByUser(userId: string, page: number, pageSize: number): Promise<{ rows: Url[]; total: number }> {
    return store.read((db) => {
      const owned = db.urls
        .filter((u) => u.userId === userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      return {
        rows: owned.slice((page - 1) * pageSize, page * pageSize),
        total: owned.length,
      };
    });
  },

  create(input: CreateUrlInput): Promise<Url> {
    return store.mutate((db) => {
      const now = new Date().toISOString();
      const url: Url = {
        id: randomUUID(),
        userId: input.userId,
        shortCode: input.shortCode,
        originalUrl: input.originalUrl,
        expiresAt: input.expiresAt,
        createdAt: now,
        updatedAt: now,
      };
      db.urls.push(url);
      return url;
    });
  },

  update(id: string, userId: string, patch: UpdateUrlInput): Promise<Url | null> {
    return store.mutate((db) => {
      const url = db.urls.find((u) => u.id === id && u.userId === userId);
      if (!url) return null;

      if (patch.originalUrl !== undefined) url.originalUrl = patch.originalUrl;
      if (patch.expiresAt !== undefined) url.expiresAt = patch.expiresAt;
      url.updatedAt = new Date().toISOString();
      return url;
    });
  },

  /** Deletes the url and its clicks together — the cascade a FK would give us. */
  remove(id: string, userId: string): Promise<boolean> {
    return store.mutate((db) => {
      const index = db.urls.findIndex((u) => u.id === id && u.userId === userId);
      if (index === -1) return false;

      db.urls.splice(index, 1);
      db.clicks = db.clicks.filter((c) => c.urlId !== id);
      return true;
    });
  },

  shortCodeExists(shortCode: string): Promise<boolean> {
    return store.read((db) => db.urls.some((u) => u.shortCode === shortCode));
  },
};
