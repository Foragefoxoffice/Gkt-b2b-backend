import { Router } from 'express';
import * as cartController from '../controllers/cart.controller.js';
import { authGuard, roleGuard } from '../middlewares/authGuard.js';

const router = Router();

router.use(authGuard);
router.use(roleGuard(['BUYER', 'ADMIN', 'SUPER_ADMIN'])); // Admins might impersonate/view

router.get('/', cartController.getCart);
router.post('/add', cartController.addToCart);
router.put('/update/:itemId', cartController.updateCartItem);
router.delete('/remove/:itemId', cartController.removeCartItem);

export default router;
