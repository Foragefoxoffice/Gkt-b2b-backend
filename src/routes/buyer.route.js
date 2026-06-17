import { Router } from 'express';
import * as buyerController from '../controllers/buyer.controller.js';
import { authGuard, roleGuard } from '../middlewares/authGuard.js';

const router = Router();

router.use(authGuard);

router.post('/', roleGuard(['ADMIN', 'SUPER_ADMIN']), buyerController.createBuyer);
router.get('/', buyerController.getBuyers);
router.get('/:id', buyerController.getBuyerById);
router.put('/:id', roleGuard(['ADMIN', 'SUPER_ADMIN']), buyerController.updateBuyer);
router.delete('/:id', roleGuard(['ADMIN', 'SUPER_ADMIN']), buyerController.deleteBuyer);

export default router;
