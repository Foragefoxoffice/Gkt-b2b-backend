import { Router } from 'express';
import * as orderController from '../controllers/order.controller.js';
import { authGuard } from '../middlewares/authGuard.js';

const router = Router();

import { upload } from '../middlewares/upload.js';

router.use(authGuard);

router.post('/', upload.single('signature'), orderController.createOrderFromCart);
router.get('/', orderController.getOrders);
router.get('/:id', orderController.getOrderById);
router.put('/:id/status', orderController.updateOrderStatus);
router.delete('/:id', orderController.deleteOrder);
router.post('/:id/email', upload.single('orderPdf'), orderController.emailOrderPdf);

export default router;
