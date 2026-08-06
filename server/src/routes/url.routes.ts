import { Router } from 'express';
import * as controller from '../controllers/url.controller.js';
import { createUrlSchema, updateUrlSchema } from '../dto/url.dto.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';

export const urlRoutes = Router();

// Every route below belongs to the authenticated user.
urlRoutes.use(requireAuth);

urlRoutes.post('/', validateBody(createUrlSchema), controller.create);
urlRoutes.get('/', controller.list);
urlRoutes.get('/:id', controller.getOne);
urlRoutes.put('/:id', validateBody(updateUrlSchema), controller.update);
urlRoutes.delete('/:id', controller.remove);
urlRoutes.get('/:id/analytics', controller.analytics);
