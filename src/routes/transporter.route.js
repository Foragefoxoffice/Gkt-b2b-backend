import { Router } from 'express';
import * as transporterController from '../controllers/transporter.controller.js';
import { authGuard, roleGuard, ADMIN_ROLES } from '../middlewares/authGuard.js';

const router = Router();

router.use(authGuard);

router.post('/', roleGuard(ADMIN_ROLES), transporterController.createTransporter);
router.get('/', transporterController.getTransporters);
router.get('/:id', transporterController.getTransporterById);
router.put('/:id', roleGuard(ADMIN_ROLES), transporterController.updateTransporter);
router.delete('/:id', roleGuard(ADMIN_ROLES), transporterController.deleteTransporter);

export default router;
