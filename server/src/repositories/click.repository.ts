import { randomUUID } from 'node:crypto';
import { store } from '../db/jsonStore.js';
import type { Click } from '../types.js';

export const clickRepository = {
  record(input: Omit<Click, 'id' | 'clickedAt'>): Promise<Click> {
    return store.mutate((db) => {
      const click: Click = {
        id: randomUUID(),
        clickedAt: new Date().toISOString(),
        ...input,
      };
      db.clicks.push(click);
      return click;
    });
  },

  countByUrlId(urlId: string): Promise<number> {
    return store.read((db) => db.clicks.reduce((n, c) => (c.urlId === urlId ? n + 1 : n), 0));
  },

  /** One lookup for a whole page of urls, so listing isn't N queries. */
  countsByUrlIds(urlIds: string[]): Promise<Map<string, number>> {
    return store.read((db) => {
      const wanted = new Set(urlIds);
      const counts = new Map(urlIds.map((id) => [id, 0]));

      for (const click of db.clicks) {
        if (wanted.has(click.urlId)) counts.set(click.urlId, (counts.get(click.urlId) ?? 0) + 1);
      }
      return counts;
    });
  },

  listByUrlId(urlId: string): Promise<Click[]> {
    return store.read((db) => db.clicks.filter((c) => c.urlId === urlId));
  },
};
