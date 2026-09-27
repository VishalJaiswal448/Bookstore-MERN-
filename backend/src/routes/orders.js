import { Router } from 'express';
import { auth, allow } from '../middleware/auth.js';
import { myOrders, allOrders, updateOrder } from '../controllers/orderController.js';

const router = Router();
router.get('/mine', auth, myOrders);
router.get('/', auth, allow('admin'), allOrders);
router.patch('/:id', auth, allow('admin'), updateOrder);
export default router;
