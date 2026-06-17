import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller.js';
import { authGuard, roleGuard } from '../middlewares/authGuard.js';

const router = Router();

router.use(authGuard);

router.get('/admin', roleGuard(['ADMIN', 'SUPER_ADMIN']), dashboardController.getAdminDashboard);
router.get('/buyer', roleGuard(['BUYER', 'ADMIN', 'SUPER_ADMIN']), dashboardController.getBuyerDashboard);

export default router;
