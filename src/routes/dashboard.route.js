import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller.js';
import { authGuard, roleGuard, ADMIN_ROLES } from '../middlewares/authGuard.js';

const router = Router();

router.use(authGuard);

router.get('/admin', roleGuard(ADMIN_ROLES), dashboardController.getAdminDashboard);
router.get('/buyer', roleGuard(['BUYER', ...ADMIN_ROLES]), dashboardController.getBuyerDashboard);

export default router;
