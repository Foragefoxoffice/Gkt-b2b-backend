import { Router } from 'express';
import * as userLogController from '../controllers/userLog.controller.js';
import { authGuard, roleGuard, ADMIN_ROLES } from '../middlewares/authGuard.js';

const router = Router();

router.use(authGuard);
router.get('/buyers', roleGuard(ADMIN_ROLES), userLogController.getBuyerLogs);

export default router;
