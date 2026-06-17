import { Router } from 'express';
import * as categoryController from '../controllers/designCategory.controller.js';
import { authGuard, roleGuard } from '../middlewares/authGuard.js';

const router = Router();

router.use(authGuard);

router.post('/', roleGuard(['ADMIN', 'SUPER_ADMIN']), categoryController.createCategory);
router.get('/', categoryController.getCategories);
router.put('/:id', roleGuard(['ADMIN', 'SUPER_ADMIN']), categoryController.updateCategory);
router.delete('/:id', roleGuard(['ADMIN', 'SUPER_ADMIN']), categoryController.deleteCategory);

export default router;
