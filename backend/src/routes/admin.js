import { Router } from 'express';
import { auth, allow } from '../middleware/auth.js';
import { dashboard, listUsers, updateUser, listAllCategories, createCategory, updateCategory, deleteCategory } from '../controllers/adminController.js';

const router = Router();
router.use(auth, allow('admin'));
router.get('/dashboard', dashboard);
router.get('/users', listUsers);
router.patch('/users/:id', updateUser);
router.get('/categories', listAllCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);
export default router;
