import { PrismaClient } from '@prisma/client';
// Importing env ensures dotenv has loaded (and DATABASE_URL is validated) before
// the Prisma client reads it from the environment.
import './env';

/** Single shared Prisma client for the whole process. */
export const prisma = new PrismaClient();
