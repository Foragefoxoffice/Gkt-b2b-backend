import { Router } from 'express';
import * as companyController from '../controllers/company.controller.js';
import { authGuard, roleGuard, ADMIN_ROLES } from '../middlewares/authGuard.js';
import { upload } from '../middlewares/upload.js';

const router = Router();

router.use(authGuard);

router.post('/', roleGuard(ADMIN_ROLES), upload.single('logo'), companyController.createCompany);
router.get('/', companyController.getCompanies);
router.put('/:id', roleGuard(ADMIN_ROLES), upload.single('logo'), companyController.updateCompany);
router.delete('/:id', roleGuard(ADMIN_ROLES), companyController.deleteCompany);

export default router;
