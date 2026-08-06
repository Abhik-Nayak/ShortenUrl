import { prisma } from '../config/db';
import { CreateUrlInput, UpdateUrlInput, Url } from '../entity/url.entity';

export function create(input: CreateUrlInput): Promise<Url> {
  return prisma.url.create({
    data: {
      userId: input.userId,
      shortCode: input.shortCode,
      longUrl: input.longUrl,
      expiresAt: input.expiresAt,
    },
  });
}

export async function shortCodeExists(shortCode: string): Promise<boolean> {
  const count = await prisma.url.count({ where: { shortCode } });
  return count > 0;
}

export async function listByUser(
  userId: string,
  limit: number,
  offset: number
): Promise<{ rows: Url[]; total: number }> {
  const [rows, total] = await Promise.all([
    prisma.url.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.url.count({ where: { userId, deletedAt: null } }),
  ]);
  return { rows, total };
}

export function findByIdForUser(id: string, userId: string): Promise<Url | null> {
  return prisma.url.findFirst({ where: { id, userId, deletedAt: null } });
}

/** Look up an active (non-deleted) link by its short code, for redirection. */
export function findByShortCode(shortCode: string): Promise<Url | null> {
  return prisma.url.findFirst({ where: { shortCode, deletedAt: null } });
}

export async function update(
  id: string,
  userId: string,
  input: UpdateUrlInput
): Promise<Url | null> {
  const data: UpdateUrlInput = {};
  if (input.longUrl !== undefined) data.longUrl = input.longUrl;
  if (input.expiresAt !== undefined) data.expiresAt = input.expiresAt;

  // Scope the update to the owner and active rows only.
  const result = await prisma.url.updateMany({
    where: { id, userId, deletedAt: null },
    data,
  });
  if (result.count === 0) return null;

  return prisma.url.findUnique({ where: { id } });
}

/** Soft delete: returns true if a matching active row was marked deleted. */
export async function softDelete(id: string, userId: string): Promise<boolean> {
  const result = await prisma.url.updateMany({
    where: { id, userId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  return result.count > 0;
}

export async function incrementClickCount(id: string): Promise<void> {
  await prisma.url.update({
    where: { id },
    data: { clickCount: { increment: 1 } },
  });
}
