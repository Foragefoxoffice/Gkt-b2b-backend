import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import { authGuard } from '../middlewares/authGuard.js';
import { upload } from '../middlewares/upload.js';

const router = Router();

router.use(authGuard);

router.get('/profile', userController.getProfile);
router.put('/profile', upload.single('avatar'), userController.updateProfile);
router.put('/change-password', userController.changePassword);

export default router;
