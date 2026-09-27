import { Router } from 'express';
import { csrfToken, login, logout, me, register } from '../controllers/authController.js';
import { auth } from '../middleware/auth.js';
import { rateLimit } from '../utils/ratelimit.js';

const router = Router();
router.get('/csrf', csrfToken);
router.post('/register', rateLimit({ windowMs: 15 * 60_000, max: 8, message: 'Too many signup attempts. Please try again later.' }), register);
router.post('/login', rateLimit({ windowMs: 15 * 60_000, max: 10, message: 'Too many login attempts. Please try again later.' }), login);
router.get('/me', auth, me);
router.post('/logout', auth, logout);
export default router;
