import { prisma } from '../config/db';
import { CreateUserInput, User } from '../entity/user.entity';

/** Prisma unique-constraint violation code (e.g. duplicate email). */
export const UNIQUE_VIOLATION = 'P2002';

export function findByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } });
}

export function findById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

export function create(input: CreateUserInput): Promise<User> {
  return prisma.user.create({
    data: {
      email: input.email,
      passwordHash: input.passwordHash,
      name: input.name ?? null,
    },
  });
}
