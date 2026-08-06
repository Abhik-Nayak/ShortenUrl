import { User as PrismaUser } from '@prisma/client';

/** A `users` row. Backed by the Prisma model (single source of truth). */
export type User = PrismaUser;

/** Input required to create a user. */
export interface CreateUserInput {
  email: string;
  passwordHash: string;
  name?: string | null;
}
