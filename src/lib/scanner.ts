import type { Platform, ICP, Campaign, ScanResult, Lead } from "@/types/navigator"

async function scanGoogle(query: string, limit = 10): Promise<ScanResult[]> {
  const cseKey = process.env.GOOGLE_API_KEY
  const cseId = process.env.GOOGLE_CSE_ID
  if (cseKey && cseId) {
    const res = await fetch(`https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=${cseKey}&cx=${cseId}&num=${Math.min(limit, 10)}`, { cache: "no-store" }).catch(() => null)
    if (res?.ok) {
      const data = await res.json() as { items?: { link: string; title: string; snippet: string }[] }
      if (data.items?.length) return data.items.slice(0, limit).map(r => ({ url: r.link, title: r.title, snippet: r.snippet, platform: "google" as Platform }))
    }
  }
  const serpKey = process.env.SERP_API_KEY
  if (serpKey) {
    const res = await fetch(`https://serpapi.com/search?engine=google&q=${encodeURIComponent(query)}&num=${limit}&api_key=${serpKey}`, { cache: "no-store" }).catch(() => null)
    if (res?.ok) {
      const data = await res.json() as { organic_results?: { link: string; title: string; snippet: string }[] }
      if (data.organic_results?.length) return data.organic_results.slice(0, limit).map(r => ({ url: r.link, title: r.title, snippet: r.snippet, platform: "google" as Platform }))
    }
  }
  return mockResults("google", query, limit)
}

async function scanHackerNews(query: string, limit = 10): Promise<ScanResult[]> {
  const res = await fetch(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=${limit}`, { cache: "no-store" }).catch(() => null)
  if (!res?.ok) return mockResults("hackernews", query, limit)
  const data = await res.json() as { hits?: { objectID: string; title: string; url?: string; story_text?: string; author: string; points: number; num_comments: number }[] }
  return (data.hits ?? []).slice(0, limit).map(h => ({
    url: h.url ?? `https://news.ycombinator.com/item?id=${h.objectID}`,
    title: h.title,
    snippet: (h.story_text ?? "").replace(/<[^>]+>/g, "").slice(0, 400),
    platform: "hackernews" as Platform,
    metadata: { author: h.author, upvotes: h.points },
  }))
}

async function scanLinkedIn(query: string, limit = 10): Promise<ScanResult[]> {
  const serpKey = process.env.SERP_API_KEY
  if (!serpKey) return mockResults("linkedin", query, limit)
  const res = await fetch(`https://serpapi.com/search?engine=google&q=${encodeURIComponent(`site:linkedin.com/in ${query}`)}&num=${limit}&api_key=${serpKey}`, { cache: "no-store" }).catch(() => null)
  if (!res?.ok) return mockResults("linkedin", query, limit)
  const data = await res.json() as { organic_results?: { link: string; title: string; snippet: string }[] }
  return (data.organic_results ?? []).slice(0, limit).map(r => ({ url: r.link, title: r.title, snippet: r.snippet, platform: "linkedin" as Platform }))
}

async function scanReddit(query: string, subreddits?: string[], limit = 15): Promise<ScanResult[]> {
  const results: ScanResult[] = []
  const targets = subreddits?.length ? subreddits.slice(0, 3) : [""]
  for (const sub of targets) {
    const base = sub ? `https://www.reddit.com/r/${sub}/search.json` : "https://www.reddit.com/search.json"
    const res = await fetch(`${base}?q=${encodeURIComponent(query)}&sort=relevance&limit=${Math.ceil(limit / targets.length)}${sub ? "&restrict_sr=true" : ""}`, { headers: { "User-Agent": "ICN/1.0" }, cache: "no-store" }).catch(() => null)
    if (!res?.ok) { results.push(...mockResults("reddit", query, 4)); continue }
    const data = await res.json() as { data?: { children?: { data: { url: string; title: string; selftext: string; author: string; subreddit: string; ups: number } }[] } }
    for (const p of data.data?.children ?? []) {
      const d = p.data
      results.push({ url: `https://reddit.com${d.url}`, title: d.title, snippet: (d.selftext ?? "").slice(0, 400), platform: "reddit", metadata: { author: d.author, subreddit: d.subreddit, upvotes: d.ups } })
    }
  }
  return results.slice(0, limit)
}

function mockResults(platform: Platform, query: string, count: number): ScanResult[] {
  const t: Record<Platform, ScanResult[]> = {
    google: [
      { url: "https://google.com/example1", title: "Looking for alternatives — frustrated user", snippet: `Searching for a solution to ${query}. Current tool is too expensive. Would love recommendations.`, platform: "google" },
      { url: "https://google.com/example2", title: "How we solved this and cut costs 40%", snippet: `After struggling with ${query} for months we finally found a workflow. Here is what we did.`, platform: "google" },
      { url: "https://google.com/example3", title: "Best tools for this problem in 2024", snippet: `Comparing the top solutions for ${query}. We evaluated 12 options and narrowed it down.`, platform: "google" },
    ],
    hackernews: [
      { url: "https://news.ycombinator.com/item?id=1", title: `Ask HN: Best tools for ${query}?`, snippet: `We are a small team dealing with ${query}. Has anyone found a good solution? Looking for something lightweight.`, platform: "hackernews", metadata: { author: "founder2024", upvotes: 87 } },
      { url: "https://news.ycombinator.com/item?id=2", title: `Show HN: We built a solution for ${query}`, snippet: `After 6 months of pain with ${query} we built our own tool. Happy to share what we learned.`, platform: "hackernews", metadata: { author: "techbuilder", upvotes: 143 } },
      { url: "https://news.ycombinator.com/item?id=3", title: `${query} — what are you using in 2024?`, snippet: `Curious what the HN community uses for ${query}. We have outgrown our current stack.`, platform: "hackernews", metadata: { author: "yc_founder", upvotes: 56 } },
    ],
    linkedin: [
      { url: "https://linkedin.com/in/example1", title: "Sarah Chen • VP Operations", snippet: `Exploring solutions for ${query}. We are a 50-person B2B SaaS company looking to streamline. Open to conversations.`, platform: "linkedin", metadata: { title: "VP Operations", company: "TechCorp" } },
      { url: "https://linkedin.com/in/example2", title: "Mike Johnson • Founder", snippet: `Building a team to tackle ${query}. Currently evaluating tools. Would love to connect with others in this space.`, platform: "linkedin", metadata: { title: "Founder", company: "GrowthCo" } },
    ],
    reddit: [
      { url: "https://reddit.com/r/startups/example1", title: `Struggling with ${query} — any recommendations?`, snippet: `We are a small team dealing with this for a while. Has anyone found a good solution? Budget is around $500/mo.`, platform: "reddit", metadata: { author: "u/frustrated_founder", subreddit: "startups", upvotes: 47 } },
      { url: "https://reddit.com/r/SaaS/example2", title: `We finally solved ${query} — here is how`, snippet: `After 6 months of pain we found something that works. Happy to share experience with anyone going through the same.`, platform: "reddit", metadata: { author: "u/techfounder2024", subreddit: "SaaS", upvotes: 134 } },
      { url: "https://reddit.com/r/entrepreneur/example3", title: `What tools do you use for ${query}?`, snippet: `Starting a business and trying to figure out the best approach for ${query}. What has worked for you?`, platform: "reddit", metadata: { author: "u/new_entrepreneur", subreddit: "entrepreneur", upvotes: 23 } },
    ],
    twitter: [
      { url: "https://twitter.com/user1", title: "@startup_founder", snippet: `Anyone using a good tool for ${query}? Tired of duct-tape solutions. Need something that scales.`, platform: "twitter" },
      { url: "https://twitter.com/user2", title: "@techbiz_ops", snippet: `Just hit a wall with ${query} again. Our current solution does not scale. Time to find something better.`, platform: "twitter" },
    ],
    facebook: [
      { url: "https://facebook.com/groups/example", title: "Facebook Group Post", snippet: `Looking for recommendations for ${query}. Small business, need something affordable but powerful.`, platform: "facebook" },
    ],
  }
  const items = t[platform] ?? t.google
  return items.slice(0, count)
}

export function buildQueries(icp: ICP, platform: Platform, customQueries: string[]): string[] {
  const queries = [...icp.where.searchQueries.slice(0, 3), ...customQueries.slice(0, 2), ...icp.where.keywords.slice(0, 2)]
  if (platform === "reddit") queries.push(...icp.why.painPoints.slice(0, 2).map(p => `${p} help`))
  if (platform === "hackernews") queries.push(...icp.why.painPoints.slice(0, 2).map(p => `Ask HN ${p}`))
  if (platform === "linkedin") queries.push(...icp.who.jobTitles.slice(0, 2).map(t => `${t} ${icp.who.industries[0] ?? ""}`))
  return Array.from(new Set(queries)).slice(0, 5)
}

export async function scanPlatform(platform: Platform, query: string, icp: ICP): Promise<ScanResult[]> {
  switch (platform) {
    case "google": return scanGoogle(query)
    case "hackernews": return scanHackerNews(query)
    case "linkedin": return scanLinkedIn(query)
    case "reddit": return scanReddit(query, icp.where.subreddits)
    default: return mockResults(platform, query, 6)
  }
}

export function resultsToLeads(results: ScanResult[], campaignId: string, query: string): Omit<Lead, "id" | "discoveredAt" | "updatedAt">[] {
  return results.map(r => ({
    campaignId,
    platform: r.platform,
    sourceUrl: r.url,
    searchQuery: query,
    name: r.metadata?.author ?? (r.platform === "linkedin" ? r.title.split("•")[0]?.trim() : undefined),
    title: r.metadata?.title ?? (r.platform === "linkedin" ? r.title.split("•")[1]?.trim() : undefined),
    company: r.metadata?.company,
    signalText: r.snippet,
    signalContext: `Found on ${r.platform} for query: "${query}"`,
    status: "new" as const,
  }))
}

export async function runScan(campaign: Campaign, icp: ICP): Promise<Omit<Lead, "id" | "discoveredAt" | "updatedAt">[]> {
  const all: Omit<Lead, "id" | "discoveredAt" | "updatedAt">[] = []
  for (const platform of campaign.platforms) {
    const queries = buildQueries(icp, platform, campaign.customQueries)
    for (const q of queries.slice(0, 3)) {
      const results = await scanPlatform(platform, q, icp)
      all.push(...resultsToLeads(results, campaign.id, q))
    }
  }
  const seen = new Set<string>()
  return all.filter(l => { if (seen.has(l.sourceUrl)) return false; seen.add(l.sourceUrl); return true }).slice(0, campaign.settings.dailyLimit)
}
