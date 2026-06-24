import { Router } from 'express';
import * as buyerController from '../controllers/buyer.controller.js';
import { authGuard, roleGuard, ADMIN_ROLES } from '../middlewares/authGuard.js';

const router = Router();

router.use(authGuard);

router.post('/', roleGuard(ADMIN_ROLES), buyerController.createBuyer);
router.get('/', buyerController.getBuyers);
router.get('/:id', buyerController.getBuyerById);
router.put('/:id', roleGuard(ADMIN_ROLES), buyerController.updateBuyer);
router.delete('/:id', roleGuard(ADMIN_ROLES), buyerController.deleteBuyer);

export default router;
