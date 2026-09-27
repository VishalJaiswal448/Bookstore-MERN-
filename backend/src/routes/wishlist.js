import { Router } from 'express';
import { auth, allow } from '../middleware/auth.js';
import { addToWishlist, getWishlist, removeFromWishlist } from '../controllers/wishlistController.js';

const router = Router();
router.use(auth, allow('customer'));
router.get('/', getWishlist);
router.post('/:bookId', addToWishlist);
router.delete('/:bookId', removeFromWishlist);
export default router;
