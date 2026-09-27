import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { parseCookies, safeEqual } from '../utils/security.js';

export async function auth(req, res, next) {
  const cookies = parseCookies(req.headers.cookie || '');
  const header = req.headers.authorization || '';
  const token = cookies.bb_token || (header.startsWith('Bearer ') ? header.slice(7) : null);
  if (!token) return res.status(401).json({ message: 'Authentication required' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'], issuer: 'bookestro-api', audience: 'bookestro-web' });
    req.user = await User.findById(decoded.id).select('-password').lean();
    if (!req.user || req.user.isActive === false) return res.status(401).json({ message: 'Authentication required' });
    next();
  } catch {
    return res.status(401).json({ message: 'Session expired. Please sign in again.' });
  }
}

export function allow(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ message: 'Access denied' });
    next();
  };
}

export function csrf(req, res, next) {
  const method = req.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return next();
  const cookies = parseCookies(req.headers.cookie || '');
  const token = req.headers['x-csrf-token'];
  if (!cookies.bb_csrf || !token || !safeEqual(cookies.bb_csrf, token)) {
    return res.status(403).json({ message: 'Invalid CSRF token' });
  }
  next();
}
