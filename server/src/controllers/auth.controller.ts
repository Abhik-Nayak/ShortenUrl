import { Request, Response } from 'express';
import { LoginRequestDto, RegisterRequestDto } from '../dto/auth.dto';
import * as authService from '../services/auth.service';

/** POST /api/v1/auth/register */
export async function register(req: Request, res: Response): Promise<void> {
  const { email, password, name } = req.body as RegisterRequestDto;
  const response = await authService.register(email, password, name);
  res.status(201).json(response);
}

/** POST /api/v1/auth/login */
export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as LoginRequestDto;
  const response = await authService.login(email, password);
  res.status(200).json(response);
}
