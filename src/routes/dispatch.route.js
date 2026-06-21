import { Router } from 'express';
import * as dispatchController from '../controllers/dispatch.controller.js';
import { authGuard, roleGuard } from '../middlewares/authGuard.js';
import { upload } from '../middlewares/upload.js';

const router = Router();

router.use(authGuard);

router.post('/', roleGuard(['ADMIN', 'SUPER_ADMIN']), upload.fields([{ name: 'bookingCopy', maxCount: 1 }, { name: 'invoiceCopy', maxCount: 1 }]), dispatchController.createDispatch);
router.get('/', dispatchController.getDispatches);
router.put('/:id/status', roleGuard(['ADMIN', 'SUPER_ADMIN']), upload.fields([{ name: 'bookingCopy', maxCount: 1 }, { name: 'invoiceCopy', maxCount: 1 }]), dispatchController.updateDispatchStatus);

export default router;
