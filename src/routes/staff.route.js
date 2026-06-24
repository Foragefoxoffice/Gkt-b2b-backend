import { Router } from 'express';
import * as staffController from '../controllers/staff.controller.js';
import { authGuard, roleGuard, ADMIN_ROLES } from '../middlewares/authGuard.js';

const router = Router();

router.use(authGuard);
router.use(roleGuard(ADMIN_ROLES));

router.get('/', staffController.getStaff);
router.post('/', staffController.createStaff);
router.put('/:id', staffController.updateStaff);
router.delete('/:id', staffController.deleteStaff);
router.get('/roles', staffController.getRoles);

export default router;
