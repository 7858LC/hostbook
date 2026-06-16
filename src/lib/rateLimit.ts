/**
 * Best-effort daily call cap for routes that trigger paid APIs (Anthropic, Apify).
 * In-memory only — resets on cold start / per serverless instance, so it's a
 * guardrail against runaway loops, not a hard guarantee.
 */
const counts = new Map<string, { day: string; count: number }>()

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function checkDailyCap(key: string, max: number): boolean {
  const day = today()
  const entry = counts.get(key)
  if (!entry || entry.day !== day) {
    counts.set(key, { day, count: 1 })
    return true
  }
  if (entry.count >= max) return false
  entry.count++
  return true
}
