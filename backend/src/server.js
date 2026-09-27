import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import cors from 'cors';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import bookRoutes from './routes/books.js';
import orderRoutes from './routes/orders.js';
import paymentRoutes from './routes/payments.js';
import wishlistRoutes from './routes/wishlist.js';
import adminRoutes from './routes/admin.js';
import { csrf } from './middleware/auth.js';
import { rateLimit } from './utils/ratelimit.js';
import { razorpayWebhook } from './controllers/paymentController.js';

const app = express();

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET must be at least 32 characters in production.');
  console.warn('Warning: use a long random JWT_SECRET before deployment.');
}
if (process.env.NODE_ENV === 'production') {
  const required = ['MONGO_URI', 'CLIENT_URL', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length) throw new Error(`Missing production environment variables: ${missing.join(', ')}`);
}

app.disable('x-powered-by');
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
const allowedOrigins = new Set([clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173']);
app.use(cors({
  origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cache-Control', 'no-store');
  next();
});

app.get('/', (req, res) => res.json({ app: 'BookBazaar API', status: 'running', health: '/api/health' }));
app.get('/api/health', (req, res) => res.json({ ok: true, app: 'BookBazaar API' }));

app.post('/api/payments/webhook', express.raw({ type: 'application/json', limit: '256kb' }), razorpayWebhook);
app.use(express.json({ limit: '100kb', strict: true }));
app.use(csrf);

app.use('/api/auth', authRoutes);
app.use('/api/books', rateLimit({ windowMs: 60_000, max: 180 }), bookRoutes);
app.use('/api/orders', rateLimit({ windowMs: 60_000, max: 60 }), orderRoutes);
app.use('/api/payments', rateLimit({ windowMs: 60_000, max: 30 }), paymentRoutes);
app.use('/api/wishlist', rateLimit({ windowMs: 60_000, max: 120 }), wishlistRoutes);
app.use('/api/admin', rateLimit({ windowMs: 60_000, max: 120 }), adminRoutes);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist, { index: false, maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0 }));
  app.get(/^(?!\/api(?:\/|$)).*/, (req, res, next) => {
    if (req.method !== 'GET' || !req.accepts('html')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.use((req, res) => res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` }));
app.use((err, req, res, next) => {
  console.error(err);
  if (err?.type === 'entity.too.large') return res.status(413).json({ message: 'Request too large.' });
  res.status(err.status || 500).json({ message: process.env.NODE_ENV === 'production' ? 'Server error.' : (err.message || 'Server error') });
});

const port = Number(process.env.PORT || 5000);
connectDB().then(() => app.listen(port, () => console.log(`API running on http://localhost:${port}`))).catch(err => {
  console.error('Startup failed:', err.message);
  process.exit(1);
});
