import { one, query, toIso } from '../db/pool.js';
import type { User } from '../types.js';

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  password_hash: string;
  created_at: string;
}

const toUser = (row: UserRow): User => ({
  id: row.id,
  email: row.email,
  name: row.name,
  passwordHash: row.password_hash,
  createdAt: toIso(row.created_at)!,
});

const normalise = (email: string) => email.trim().toLowerCase();

export const userRepository = {
  async findByEmail(email: string): Promise<User | null> {
    const { rows } = await query<UserRow>('SELECT * FROM users WHERE email = $1', [
      normalise(email),
    ]);
    return rows[0] ? toUser(rows[0]) : null;
  },

  async findById(id: string): Promise<User | null> {
    const { rows } = await query<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] ? toUser(rows[0]) : null;
  },

  async create(input: { email: string; name: string | null; passwordHash: string }): Promise<User> {
    const result = await query<UserRow>(
      `INSERT INTO users (email, name, password_hash)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [normalise(input.email), input.name, input.passwordHash],
    );
    return toUser(one(result));
  },
};
