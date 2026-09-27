import { Router } from 'express';
import { listBooks, myBooks, getBook, createBook, updateBook, deleteBook, categories, recommendations } from '../controllers/bookController.js';
import { auth, allow } from '../middleware/auth.js';

const router = Router();
router.get('/', listBooks);
router.get('/categories', categories);
router.get('/recommendations', recommendations);
router.get('/mine', auth, allow('seller', 'admin'), myBooks);
router.get('/:id', getBook);
router.post('/', auth, allow('seller', 'admin'), createBook);
router.put('/:id', auth, allow('seller', 'admin'), updateBook);
router.delete('/:id', auth, allow('seller', 'admin'), deleteBook);
export default router;
