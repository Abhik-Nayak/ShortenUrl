import { randomUUID } from 'node:crypto';
import { store } from '../db/jsonStore.js';
import type { User } from '../types.js';

const normalise = (email: string) => email.trim().toLowerCase();

export const userRepository = {
  findByEmail(email: string): Promise<User | null> {
    const key = normalise(email);
    return store.read((db) => db.users.find((u) => u.email === key) ?? null);
  },

  findById(id: string): Promise<User | null> {
    return store.read((db) => db.users.find((u) => u.id === id) ?? null);
  },

  create(input: { email: string; name: string | null; passwordHash: string }): Promise<User> {
    return store.mutate((db) => {
      const user: User = {
        id: randomUUID(),
        email: normalise(input.email),
        name: input.name,
        passwordHash: input.passwordHash,
        createdAt: new Date().toISOString(),
      };
      db.users.push(user);
      return user;
    });
  },
};
