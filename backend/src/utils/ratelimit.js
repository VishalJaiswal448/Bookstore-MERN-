const buckets = new Map();

export function rateLimit({ windowMs = 60_000, max = 60, message = 'Too many requests. Please try again shortly.' } = {}) {
  return (req, res, next) => {
    const key = `${req.ip || 'unknown'}:${req.path}`;
    const now = Date.now();
    let entry = buckets.get(key);
    if (!entry || now - entry.startedAt > windowMs) {
      entry = { startedAt: now, count: 0 };
      buckets.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > max) return res.status(429).json({ message });
    next();
  };
}

setInterval(() => {
  const cutoff = Date.now() - 15 * 60_000;
  for (const [key, entry] of buckets) if (entry.startedAt < cutoff) buckets.delete(key);
}, 5 * 60_000).unref();
