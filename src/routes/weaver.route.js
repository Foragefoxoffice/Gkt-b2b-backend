import { Router } from 'express';
import * as weaverController from '../controllers/weaver.controller.js';
import { authGuard, roleGuard } from '../middlewares/authGuard.js';

const router = Router();

router.use(authGuard);
router.use(roleGuard(['ADMIN', 'SUPER_ADMIN']));

router.post('/', weaverController.createWeaver);
router.get('/', weaverController.getWeavers);
router.get('/:id', weaverController.getWeaverById);
router.put('/:id', weaverController.updateWeaver);
router.delete('/:id', weaverController.deleteWeaver);

export default router;
