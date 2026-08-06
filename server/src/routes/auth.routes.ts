import { Router } from 'express';
import * as controller from '../controllers/auth.controller.js';
import { loginSchema, registerSchema } from '../dto/auth.dto.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';

export const authRoutes = Router();

authRoutes.post('/register', validateBody(registerSchema), controller.register);
authRoutes.post('/login', validateBody(loginSchema), controller.login);
authRoutes.get('/me', requireAuth, controller.me);
