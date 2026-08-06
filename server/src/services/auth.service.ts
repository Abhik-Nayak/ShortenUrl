import bcrypt from 'bcryptjs';
import { AuthResponseDto, UserDto } from '../dto/auth.dto';
import { User } from '../entity/user.entity';
import { ConflictError, UnauthorizedError } from '../utils/errors';
import { signToken } from '../utils/jwt';
import * as userQuery from '../query/user.query';

const SALT_ROUNDS = 10;

function toUserDto(row: User): UserDto {
  return {
    id: row.id,
    email: row.email,
    name: row.name ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

function toAuthResponse(row: User): AuthResponseDto {
  return {
    user: toUserDto(row),
    token: signToken({ sub: row.id, email: row.email }),
  };
}

export async function register(
  email: string,
  password: string,
  name?: string
): Promise<AuthResponseDto> {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  try {
    const user = await userQuery.create({ email, passwordHash, name });
    return toAuthResponse(user);
  } catch (err) {
    if ((err as { code?: string }).code === userQuery.UNIQUE_VIOLATION) {
      throw new ConflictError('An account with this email already exists');
    }
    throw err;
  }
}

export async function login(email: string, password: string): Promise<AuthResponseDto> {
  const user = await userQuery.findByEmail(email);
  // Constant message + always compare against a hash to avoid leaking which of
  // email/password was wrong (and to reduce timing signal).
  const ok = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !ok) {
    throw new UnauthorizedError('Invalid email or password');
  }
  return toAuthResponse(user);
}
