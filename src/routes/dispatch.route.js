import { Router } from 'express';
import * as dispatchController from '../controllers/dispatch.controller.js';
import { authGuard, roleGuard, ADMIN_ROLES } from '../middlewares/authGuard.js';
import { upload } from '../middlewares/upload.js';

const router = Router();

router.use(authGuard);

router.post('/', roleGuard(ADMIN_ROLES), upload.fields([{ name: 'bookingCopy', maxCount: 1 }, { name: 'invoiceCopy', maxCount: 1 }]), dispatchController.createDispatch);
router.get('/', dispatchController.getDispatches);
router.put('/:id/status', roleGuard(ADMIN_ROLES), upload.fields([{ name: 'bookingCopy', maxCount: 1 }, { name: 'invoiceCopy', maxCount: 1 }]), dispatchController.updateDispatchStatus);

export default router;
