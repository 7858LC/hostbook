import { nanoid } from "nanoid"
import type { ICP, Campaign, Platform, ScanResult, Lead } from "@/types/navigator"

// ---------------------------------------------------------------------------
// Platform scanners — each returns raw ScanResult[]
// ---------------------------------------------------------------------------

async function scanGoogle(query: string, limit = 10): Promise<ScanResult[]> {
  const apiKey = process.env.SERP_API_KEY
  if (!apiKey) {
    return mockResults("google", query, limit)
  }
  const url = `https://serpapi.com/search?engine=google&q=${encodeURIComponent(query)}&num=${limit}&api_key=${apiKey}`
  const res = await fetch(url, { next: { revalidate: 0 } })
  if (!res.ok) return mockResults("google", query, limit)
  const data = await res.json() as { organic_results?: Array<{ link: string; title: string; snippet: string }> }
  return (data.organic_results ?? []).slice(0, limit).map(r => ({
    url: r.link,
    title: r.title,
    snippet: r.snippet,
    platform: "google" as Platform,
  }))
}

async function scanLinkedIn(query: string, limit = 10): Promise<ScanResult[]> {
  const apiKey = process.env.SERP_API_KEY
  const linkedInQuery = `site:linkedin.com/in ${query}`
  if (!apiKey) {
    return mockResults("linkedin", query, limit)
  }
  const url = `https://serpapi.com/search?engine=google&q=${encodeURIComponent(linkedInQuery)}&num=${limit}&api_key=${apiKey}`
  const res = await fetch(url, { next: { revalidate: 0 } })
  if (!res.ok) return mockResults("linkedin", query, limit)
  const data = await res.json() as { organic_results?: Array<{ link: string; title: string; snippet: string }> }
  return (data.organic_results ?? []).slice(0, limit).map(r => ({
    url: r.link,
    title: r.title,
    snippet: r.snippet,
    platform: "linkedin" as Platform,
    metadata: { profileUrl: r.link },
  }))
}

async function scanReddit(query: string, subreddits?: string[], limit = 15): Promise<ScanResult[]> {
  const results: ScanResult[] = []
  const targets = subreddits && subreddits.length > 0
    ? subreddits.map(s => `r/${s}`)
    : [""]

  for (const target of targets.slice(0, 3)) {
    const baseUrl = target
      ? `https://www.reddit.com/${target}/search.json`
      : "https://www.reddit.com/search.json"
    const url = `${baseUrl}?q=${encodeURIComponent(query)}&sort=relevance&limit=${Math.ceil(limit / targets.length)}&restrict_sr=${target ? "true" : "false"}`

    const res = await fetch(url, {
      headers: { "User-Agent": "HostBook/1.0 LeadNavigator" },
      next: { revalidate: 0 },
    })
    if (!res.ok) {
      results.push(...mockResults("reddit", query, 5))
      continue
    }
    const data = await res.json() as {
      data?: { children?: Array<{ data: { url: string; title: string; selftext: string; author: string; subreddit: string; ups: number; created_utc: number } }> }
    }
    const posts = data.data?.children ?? []
    for (const p of posts) {
      const d = p.data
      results.push({
        url: `https://reddit.com${d.url}`,
        title: d.title,
        snippet: (d.selftext ?? "").slice(0, 400),
        platform: "reddit" as Platform,
        metadata: {
          author: d.author,
          subreddit: d.subreddit,
          upvotes: d.ups,
          date: new Date(d.created_utc * 1000).toISOString(),
        },
      })
    }
  }
  return results.slice(0, limit)
}

async function scanTwitter(query: string, limit = 10): Promise<ScanResult[]> {
  const apiKey = process.env.SERP_API_KEY
  if (!apiKey) return mockResults("twitter", query, limit)
  const url = `https://serpapi.com/search?engine=twitter&q=${encodeURIComponent(query)}&num=${limit}&api_key=${apiKey}`
  const res = await fetch(url, { next: { revalidate: 0 } })
  if (!res.ok) return mockResults("twitter", query, limit)
  const data = await res.json() as { tweets_results?: Array<{ link: string; snippet: string; user?: { name: string } }> }
  return (data.tweets_results ?? []).slice(0, limit).map(r => ({
    url: r.link ?? "",
    title: r.user?.name ?? "Twitter User",
    snippet: r.snippet ?? "",
    platform: "twitter" as Platform,
  }))
}

// ---------------------------------------------------------------------------
// Demo / fallback results when no API keys are configured
// ---------------------------------------------------------------------------
function mockResults(platform: Platform, query: string, count: number): ScanResult[] {
  const templates: Record<Platform, Array<Partial<ScanResult>>> = {
    google: [
      { title: "Looking for alternatives to [product] - frustrated user", snippet: `"I've been searching for a solution to ${query}. My current tool is too expensive and doesn't scale. Would love recommendations..."` },
      { title: "How we solved [pain point] and saved 40% costs", snippet: `"After struggling with ${query} for months, we finally found a workflow that works. Here's what we did..."` },
      { title: "[Job posting] Senior PM needed - experience with ${query}", snippet: `"We're a growing startup looking for someone who understands ${query} deeply. We're building in this space..."` },
    ],
    linkedin: [
      { title: "Sarah Chen • VP Operations at TechCorp", snippet: `"Exploring solutions for ${query}. We're a 50-person B2B SaaS company looking to streamline our processes. Open to conversations!"`, metadata: { profileUrl: "https://linkedin.com/in/example", title: "VP Operations", company: "TechCorp" } },
      { title: "Mike Johnson • Founder at GrowthCo", snippet: `"Building a team to tackle ${query}. Currently evaluating tools and would love to connect with others in this space."`, metadata: { profileUrl: "https://linkedin.com/in/example2", title: "Founder", company: "GrowthCo" } },
    ],
    reddit: [
      { title: `Struggling with ${query} - any recommendations?`, snippet: `"We're a small team and we've been dealing with this problem for a while. Has anyone found a good solution? Our budget is around $500/mo..."`, metadata: { author: "u/frustrated_founder", subreddit: "startups", upvotes: 47 } },
      { title: `We finally solved ${query} - here's how`, snippet: `"After 6 months of pain, we found something that works. Happy to share our experience with anyone going through the same..."`, metadata: { author: "u/techfounder2024", subreddit: "SaaS", upvotes: 134 } },
    ],
    twitter: [
      { title: "@user_handle", snippet: `"Anyone using a good tool for ${query}? Tired of duct-tape solutions. #startups #productivity"` },
      { title: "@another_user", snippet: `"Just hit a wall with ${query} again. Our current solution doesn't scale. Time to find something better."` },
    ],
    facebook: [
      { title: "Facebook Group Post", snippet: `"Looking for recommendations for ${query}. We're a small business and need something affordable but powerful."` },
    ],
  }
  const t = templates[platform] ?? templates.google
  return Array.from({ length: Math.min(count, t.length) }, (_, i) => ({
    url: `https://${platform}.com/example-${i}`,
    title: t[i % t.length]?.title ?? `Result ${i}`,
    snippet: t[i % t.length]?.snippet ?? `Example result for ${query}`,
    platform,
    metadata: t[i % t.length]?.metadata,
  }))
}

// ---------------------------------------------------------------------------
// Build search queries from ICP
// ---------------------------------------------------------------------------
export function buildQueriesFromICP(icp: ICP, platform: Platform): string[] {
  const queries: string[] = []

  // Use explicitly configured search queries first
  if (icp.where.searchQueries.length > 0) {
    queries.push(...icp.where.searchQueries.slice(0, 3))
  }

  // Build queries from pain points + keywords
  const keywords = icp.where.keywords.slice(0, 3)
  const painPoints = icp.why.painPoints.slice(0, 2)

  for (const kw of keywords) {
    queries.push(kw)
    if (painPoints[0]) queries.push(`${kw} ${painPoints[0]}`)
  }

  // Platform-specific query augmentation
  if (platform === "reddit") {
    queries.push(...icp.why.painPoints.slice(0, 2).map(p => `${p} help`))
  }
  if (platform === "linkedin") {
    queries.push(...icp.who.jobTitles.slice(0, 2).map(t => `${t} ${icp.who.industries[0] ?? ""}`))
  }

  return Array.from(new Set(queries)).slice(0, 5)
}

// ---------------------------------------------------------------------------
// Unified scan entry point
// ---------------------------------------------------------------------------
export async function scanPlatform(
  platform: Platform,
  query: string,
  icp: ICP,
  limit = 10
): Promise<ScanResult[]> {
  switch (platform) {
    case "google":    return scanGoogle(query, limit)
    case "linkedin":  return scanLinkedIn(query, limit)
    case "reddit":    return scanReddit(query, icp.where.subreddits, limit)
    case "twitter":   return scanTwitter(query, limit)
    default:          return mockResults(platform, query, limit)
  }
}

// ---------------------------------------------------------------------------
// Convert scan results to Lead candidates
// ---------------------------------------------------------------------------
export function scanResultsToLeads(
  results: ScanResult[],
  campaignId: string,
  query: string
): Omit<Lead, "id" | "discoveredAt" | "updatedAt">[] {
  return results.map(r => ({
    campaignId,
    platform: r.platform,
    sourceUrl: r.url,
    searchQuery: query,
    name: r.metadata?.author ? (r.platform === "reddit" ? r.metadata.author : r.title.split("•")[0]?.trim()) : undefined,
    title: r.metadata?.title ?? (r.platform === "linkedin" ? r.title.split("•")[1]?.trim() : undefined),
    company: r.metadata?.company,
    signalText: r.snippet,
    signalContext: `Found via ${r.platform} search for "${query}"`,
    status: "new" as const,
  }))
}

// ---------------------------------------------------------------------------
// Run a full scan campaign sweep
// ---------------------------------------------------------------------------
export async function runCampaignScan(
  campaign: Campaign,
  icp: ICP
): Promise<Array<Omit<Lead, "id" | "discoveredAt" | "updatedAt">>> {
  const allLeads: Array<Omit<Lead, "id" | "discoveredAt" | "updatedAt">> = []

  for (const platform of campaign.platforms) {
    const queries = [
      ...buildQueriesFromICP(icp, platform),
      ...campaign.customQueries,
    ].slice(0, 4)

    for (const query of queries) {
      const results = await scanPlatform(platform, query, icp, 8)
      const leads = scanResultsToLeads(results, campaign.id, query)
      allLeads.push(...leads)
    }
  }

  // Deduplicate by URL
  const seen = new Set<string>()
  return allLeads.filter(l => {
    if (seen.has(l.sourceUrl)) return false
    seen.add(l.sourceUrl)
    return true
  })
}
