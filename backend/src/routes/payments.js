import { Router } from 'express';
import { auth, allow } from '../middleware/auth.js';
import { createRazorpayOrder, verifyRazorpayPayment } from '../controllers/paymentController.js';

const router = Router();
router.post('/create-order', auth, allow('customer'), createRazorpayOrder);
router.post('/verify', auth, allow('customer'), verifyRazorpayPayment);
export default router;
