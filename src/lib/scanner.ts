import type { TradesLead } from "@/types/leads"

const TRADE_SUBREDDITS = ["HVAC", "Plumbing", "electricians", "HomeImprovement", "DIY", "homeowners", "HomeRepair", "mildlyinfuriating"]

const TRADE_QUERIES = [
  "need HVAC repair recommendation",
  "AC not working need help",
  "furnace broken emergency",
  "need plumber recommendation",
  "burst pipe water damage",
  "toilet overflowing emergency plumber",
  "need electrician recommendation",
  "no power circuit breaker",
  "electrical outlet sparking",
  "HVAC installation cost",
  "water heater not working",
  "drain clogged need plumber",
]

async function scanSubreddit(subreddit: string, query: string): Promise<TradesLead[]> {
  const res = await fetch(
    `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&sort=new&limit=10&restrict_sr=true`,
    { headers: { "User-Agent": "LeadFlow/1.0" }, cache: "no-store" }
  ).catch(() => null)
  if (!res?.ok) return []
  const data = await res.json() as { data?: { children?: { data: { id: string; url: string; title: string; selftext: string; author: string; created_utc: number; ups: number } }[] } }
  return (data.data?.children ?? []).map(p => ({
    id: `reddit_${p.data.id}`,
    discoveredAt: new Date(p.data.created_utc * 1000).toISOString(),
    platform: "reddit" as const,
    sourceUrl: `https://reddit.com${p.data.url}`,
    rawText: `${p.data.title}\n\n${p.data.selftext}`.slice(0, 1000),
    authorHandle: `u/${p.data.author}`,
    tradeType: "unknown" as const,
    urgency: "unknown" as const,
    location: undefined,
    locationState: undefined,
    problemSummary: p.data.title,
    qualityScore: 0,
    estimatedValue: 75,
    status: "raw" as const,
  }))
}

async function scanHackerNews(query: string): Promise<TradesLead[]> {
  const res = await fetch(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=5`, { cache: "no-store" }).catch(() => null)
  if (!res?.ok) return []
  const data = await res.json() as { hits?: { objectID: string; title: string; url?: string; story_text?: string; author: string }[] }
  return (data.hits ?? []).map(h => ({
    id: `hn_${h.objectID}`,
    discoveredAt: new Date().toISOString(),
    platform: "hackernews" as const,
    sourceUrl: h.url ?? `https://news.ycombinator.com/item?id=${h.objectID}`,
    rawText: `${h.title}\n\n${(h.story_text ?? "").replace(/<[^>]+>/g, "")}`.slice(0, 1000),
    authorHandle: h.author,
    tradeType: "unknown" as const,
    urgency: "unknown" as const,
    location: undefined,
    locationState: undefined,
    problemSummary: h.title,
    qualityScore: 0,
    estimatedValue: 75,
    status: "raw" as const,
  }))
}

export async function runTradeScan(maxLeads = 50): Promise<TradesLead[]> {
  const all: TradesLead[] = []
  const seen = new Set<string>()

  for (const sub of TRADE_SUBREDDITS.slice(0, 4)) {
    for (const q of TRADE_QUERIES.slice(0, 3)) {
      const results = await scanSubreddit(sub, q)
      for (const r of results) {
        if (!seen.has(r.id)) { seen.add(r.id); all.push(r) }
      }
      if (all.length >= maxLeads) break
    }
    if (all.length >= maxLeads) break
  }

  const hnResults = await scanHackerNews("HVAC plumbing electrical home repair")
  for (const r of hnResults) {
    if (!seen.has(r.id)) { seen.add(r.id); all.push(r) }
  }

  return all.slice(0, maxLeads)
}
