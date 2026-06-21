import { Router } from 'express';
import * as productRequestController from '../controllers/productRequest.controller.js';
import { authGuard } from '../middlewares/authGuard.js';

const router = Router();

router.use(authGuard);

router.post('/', productRequestController.createProductRequest);
router.get('/', productRequestController.getProductRequests);
router.get('/:id', productRequestController.getProductRequestById);
router.put('/:id/status', productRequestController.updateProductRequestStatus);

export default router;
