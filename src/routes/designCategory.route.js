import { Router } from 'express';
import * as categoryController from '../controllers/designCategory.controller.js';
import { authGuard, roleGuard, ADMIN_ROLES } from '../middlewares/authGuard.js';

const router = Router();

router.use(authGuard);

router.post('/', roleGuard(ADMIN_ROLES), categoryController.createCategory);
router.get('/', categoryController.getCategories);
router.put('/:id', roleGuard(ADMIN_ROLES), categoryController.updateCategory);
router.delete('/:id', roleGuard(ADMIN_ROLES), categoryController.deleteCategory);

export default router;
