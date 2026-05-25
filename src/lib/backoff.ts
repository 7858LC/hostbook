export async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 4,
  baseDelayMs = 500
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastErr = err;
      const status =
        (err as { code?: number; status?: number })?.code ??
        (err as { code?: number; status?: number })?.status;
      const retryable = status === 429 || status === 500 || status === 503;
      if (!retryable || attempt === maxRetries) throw err;
      const jitter = Math.random() * baseDelayMs;
      await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** attempt + jitter));
    }
  }
  throw lastErr;
}
