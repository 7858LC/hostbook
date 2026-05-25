interface Window { count: number; resetAt: number; }
const store = new Map<string, Window>();
setInterval(() => { const now = Date.now(); store.forEach((w, k) => { if (now > w.resetAt) store.delete(k); }); }, 5 * 60 * 1000);

export interface RateLimitResult { success: boolean; remaining: number; resetAt: number; }

export function rateLimit(key: string, limit: number, windowMs = 60_000): RateLimitResult {
  const now = Date.now();
  let win = store.get(key);
  if (!win || now > win.resetAt) { win = { count: 0, resetAt: now + windowMs }; store.set(key, win); }
  win.count++;
  return { success: win.count <= limit, remaining: Math.max(0, limit - win.count), resetAt: win.resetAt };
}

export function rateLimitHeaders(r: RateLimitResult, limit: number) {
  return {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(r.remaining),
    "X-RateLimit-Reset": String(Math.ceil(r.resetAt / 1000)),
    ...(r.success ? {} : { "Retry-After": String(Math.ceil((r.resetAt - Date.now()) / 1000)) }),
  };
}
