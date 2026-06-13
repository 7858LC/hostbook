import type { TradesLead } from "@/types/leads"

const TRADE_SUBREDDITS = [
  "HVAC", "Plumbing", "electricians", "HomeImprovement",
  "DIY", "homeowners", "HomeRepair", "Roofing", "RoofingContractors",
]

const TRADE_QUERIES = [
  // HVAC
  "need HVAC repair recommendation",
  "AC not working need help",
  "furnace broken emergency",
  "heat pump not working",
  // Plumbing
  "need plumber recommendation",
  "burst pipe water damage",
  "toilet overflowing emergency",
  "water heater not working",
  "drain clogged need plumber",
  // Electrical
  "need electrician recommendation",
  "no power circuit breaker tripped",
  "electrical outlet sparking",
  // Roofing
  "need roofer recommendation",
  "roof leaking after rain",
  "shingles blown off storm damage",
  "roof repair estimate",
]

async function scanSubreddit(subreddit: string, query: string): Promise<TradesLead[]> {
  const res = await fetch(
    `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&sort=new&limit=10&restrict_sr=true`,
    { headers: { "User-Agent": "LeadFlow/1.0" }, cache: "no-store" }
  ).catch(() => null)
  if (!res?.ok) return []
  const data = await res.json() as { data?: { children?: { data: { id: string; url: string; title: string; selftext: string; author: string; created_utc: number } }[] } }
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
  const res = await fetch(
    `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=5`,
    { cache: "no-store" }
  ).catch(() => null)
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

export interface FbGroupPost {
  postId: string
  text: string
  authorName?: string
  postUrl?: string
  groupName?: string
  timestamp?: string
}

export function fbPostsToLeads(posts: FbGroupPost[]): TradesLead[] {
  return posts.map(p => ({
    id: `fb_${p.postId}`,
    discoveredAt: p.timestamp ?? new Date().toISOString(),
    platform: "facebook" as const,
    sourceUrl: p.postUrl ?? "",
    rawText: p.text.slice(0, 1000),
    authorHandle: p.authorName,
    groupName: p.groupName,
    tradeType: "unknown" as const,
    urgency: "unknown" as const,
    location: undefined,
    locationState: undefined,
    problemSummary: p.text.slice(0, 120),
    qualityScore: 0,
    estimatedValue: 100, // FB neighborhood leads are warmer → higher base value
    status: "raw" as const,
  }))
}

export async function runTradeScan(maxLeads = 60): Promise<TradesLead[]> {
  const all: TradesLead[] = []
  const seen = new Set<string>()

  for (const sub of TRADE_SUBREDDITS.slice(0, 6)) {
    for (const q of TRADE_QUERIES.slice(0, 4)) {
      const results = await scanSubreddit(sub, q)
      for (const r of results) {
        if (!seen.has(r.id)) { seen.add(r.id); all.push(r) }
      }
      if (all.length >= maxLeads) break
    }
    if (all.length >= maxLeads) break
  }

  const hnResults = await scanHackerNews("HVAC plumbing electrical roofing home repair")
  for (const r of hnResults) {
    if (!seen.has(r.id)) { seen.add(r.id); all.push(r) }
  }

  return all.slice(0, maxLeads)
}
