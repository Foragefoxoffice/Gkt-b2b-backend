import { Router } from 'express';
import * as orderController from '../controllers/order.controller.js';
import { authGuard } from '../middlewares/authGuard.js';

const router = Router();

router.use(authGuard);

router.post('/', orderController.createOrderFromCart);
router.get('/', orderController.getOrders);
router.get('/:id', orderController.getOrderById);
router.put('/:id/status', orderController.updateOrderStatus);

export default router;
