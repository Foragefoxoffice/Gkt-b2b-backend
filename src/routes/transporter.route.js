import { Router } from 'express';
import * as transporterController from '../controllers/transporter.controller.js';
import { authGuard, roleGuard } from '../middlewares/authGuard.js';

const router = Router();

router.use(authGuard);

router.post('/', roleGuard(['ADMIN', 'SUPER_ADMIN']), transporterController.createTransporter);
router.get('/', transporterController.getTransporters);
router.get('/:id', transporterController.getTransporterById);
router.put('/:id', roleGuard(['ADMIN', 'SUPER_ADMIN']), transporterController.updateTransporter);
router.delete('/:id', roleGuard(['ADMIN', 'SUPER_ADMIN']), transporterController.deleteTransporter);

export default router;
