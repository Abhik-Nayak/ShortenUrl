import { Router } from 'express';
import {
  createUrl,
  deleteUrl,
  getAnalytics,
  getUrl,
  listUrls,
  updateUrl,
} from '../controllers/url.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  createUrlSchema,
  idParamSchema,
  updateUrlSchema,
} from '../validators/url.validator';

const router = Router();

// All URL management endpoints require authentication.
router.use(authMiddleware);

router.post('/', validate(createUrlSchema), createUrl);
router.get('/', listUrls);
router.get('/:id', validate(idParamSchema), getUrl);
router.put('/:id', validate(updateUrlSchema), updateUrl);
router.delete('/:id', validate(idParamSchema), deleteUrl);
router.get('/:id/analytics', validate(idParamSchema), getAnalytics);

export default router;
