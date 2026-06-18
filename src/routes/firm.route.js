import { Router } from 'express';
import * as firmController from '../controllers/firm.controller.js';
import { authGuard, roleGuard } from '../middlewares/authGuard.js';
import { upload } from '../middlewares/upload.js';

const router = Router();

// Only ADMIN and SUPER_ADMIN can manage firms
router.use(authGuard);
router.use(roleGuard(['ADMIN', 'SUPER_ADMIN']));

router.post('/', upload.single('logo'), firmController.createFirm);
router.get('/', firmController.getFirms);
router.get('/:id', firmController.getFirmById);
router.put('/:id', upload.single('logo'), firmController.updateFirm);
router.delete('/:id', firmController.deleteFirm); // Soft delete

export default router;
