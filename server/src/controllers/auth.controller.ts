import { Request, Response } from 'express';
import { AuthResponseDto, LoginRequestDto, RegisterRequestDto } from '../dto/auth.dto';
import { ConflictError, UnauthorizedError } from '../utils/errors';

/**
 * POST /api/v1/auth/register
 * Trigger: email "existing@example.com" -> 409 conflict.
 */
export function register(req: Request, res: Response): void {
  const { email, name } = req.body as RegisterRequestDto;

  if (email === 'existing@example.com') {
    throw new ConflictError('An account with this email already exists');
  }

  const response: AuthResponseDto = {
    user: {
      id: 'usr_mock_1',
      email,
      name,
      createdAt: new Date().toISOString(),
    },
    token: 'mock.jwt.token',
  };

  res.status(201).json(response);
}

/**
 * POST /api/v1/auth/login
 * Trigger: password "wrongpassword" -> 401 unauthorized.
 */
export function login(req: Request, res: Response): void {
  const { email, password } = req.body as LoginRequestDto;

  if (password === 'wrongpassword') {
    throw new UnauthorizedError('Invalid email or password');
  }

  const response: AuthResponseDto = {
    user: {
      id: 'usr_mock_1',
      email,
      createdAt: new Date().toISOString(),
    },
    token: 'mock.jwt.token',
  };

  res.status(200).json(response);
}
