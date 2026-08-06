import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { conflict, unauthorized } from '../errors.js';
import { userRepository } from '../repositories/user.repository.js';
import type { PublicUser, User } from '../types.js';
import type { LoginInput, RegisterInput } from '../dto/auth.dto.js';

const SALT_ROUNDS = 10;

export interface AuthResult {
  user: PublicUser;
  token: string;
}

function toPublic({ passwordHash: _passwordHash, ...user }: User): PublicUser {
  return user;
}

function issueToken(user: User): string {
  return jwt.sign({ email: user.email }, env.jwtSecret, {
    subject: user.id,
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): { sub: string; email: string } {
  const payload = jwt.verify(token, env.jwtSecret);
  if (typeof payload === 'string' || !payload.sub) throw new Error('Malformed token payload');
  return { sub: payload.sub, email: String(payload.email ?? '') };
}

export async function register(input: RegisterInput): Promise<AuthResult> {
  if (await userRepository.findByEmail(input.email)) {
    throw conflict('An account with that email already exists');
  }

  const user = await userRepository.create({
    email: input.email,
    name: input.name ?? null,
    passwordHash: await bcrypt.hash(input.password, SALT_ROUNDS),
  });

  return { user: toPublic(user), token: issueToken(user) };
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const user = await userRepository.findByEmail(input.email);

  // Same error either way, so the response can't be used to enumerate accounts.
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw unauthorized('Invalid email or password');
  }

  return { user: toPublic(user), token: issueToken(user) };
}

export async function getProfile(userId: string): Promise<PublicUser> {
  const user = await userRepository.findById(userId);
  if (!user) throw unauthorized('Account no longer exists');
  return toPublic(user);
}
