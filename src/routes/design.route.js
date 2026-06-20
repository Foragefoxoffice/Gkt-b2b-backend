import { Router } from 'express';
import * as designController from '../controllers/design.controller.js';
import { authGuard, roleGuard } from '../middlewares/authGuard.js';
import { upload } from '../middlewares/upload.js';

const router = Router();

router.use(authGuard);

router.post('/', roleGuard(['ADMIN', 'SUPER_ADMIN']), upload.any(), designController.createDesign);
router.get('/', designController.getDesigns);
router.get('/:id', designController.getDesignById);
router.put('/:id', roleGuard(['ADMIN', 'SUPER_ADMIN']), upload.any(), designController.updateDesign);
router.delete('/:id', roleGuard(['ADMIN', 'SUPER_ADMIN']), designController.deleteDesign);

export default router;
