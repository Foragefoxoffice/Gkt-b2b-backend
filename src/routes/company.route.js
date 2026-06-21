import { Router } from 'express';
import * as companyController from '../controllers/company.controller.js';
import { authGuard, roleGuard } from '../middlewares/authGuard.js';

const router = Router();

router.use(authGuard);

router.post('/', roleGuard(['ADMIN', 'SUPER_ADMIN']), companyController.createCompany);
router.get('/', companyController.getCompanies);
router.put('/:id', roleGuard(['ADMIN', 'SUPER_ADMIN']), companyController.updateCompany);
router.delete('/:id', roleGuard(['ADMIN', 'SUPER_ADMIN']), companyController.deleteCompany);

export default router;
