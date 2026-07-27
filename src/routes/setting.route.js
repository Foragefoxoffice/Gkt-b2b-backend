import express from 'express';
import { getSettings, updateSetting } from '../controllers/setting.controller.js';
import { authGuard, roleGuard, ADMIN_ROLES } from '../middlewares/authGuard.js';

const router = express.Router();

// Apply auth middleware to all setting routes
router.use(authGuard);
router.use(roleGuard(['SUPER_ADMIN'])); // Assuming superadmin only for settings

router.get('/', getSettings);
router.put('/:key', updateSetting);

export default router;
