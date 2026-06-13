import { NextRequest, NextResponse } from "next/server"
import { fbPostsToLeads } from "@/lib/scanner"
import { qualifyBatch } from "@/lib/qualify"
import { getLeads, saveLeads } from "@/lib/storage"

const APIFY_TOKEN = process.env.APIFY_API_TOKEN
const ACTOR_ID = "apify/facebook-groups-scraper"

const TRADES_KEYWORDS = [
  "roofer", "roofing", "roof leak", "roof repair", "roof damage",
  "plumber", "plumbing", "pipe burst", "drain clog", "water heater",
  "electrician", "electrical", "circuit breaker", "outlet",
  "HVAC", "AC repair", "furnace", "heat pump", "air conditioning",
  "contractor", "handyman", "need a recommendation",
]

interface ApifyPost {
  postId?: string
  id?: string
  text?: string
  message?: string
  authorName?: string
  author?: { name?: string }
  url?: string
  postUrl?: string
  time?: string
  timestamp?: string
  groupName?: string
}

export async function POST(req: NextRequest) {
  if (!APIFY_TOKEN) {
    return NextResponse.json({ error: "APIFY_API_TOKEN not set" }, { status: 503 })
  }

  const { groupUrls } = await req.json() as { groupUrls?: string[] }
  if (!groupUrls?.length) {
    return NextResponse.json({ error: "groupUrls required" }, { status: 400 })
  }

  // Start Apify actor run
  const startRes = await fetch(
    `https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startUrls: groupUrls.map(url => ({ url })),
        resultsLimit: 50,
        // Filter posts matching trades keywords
      }),
    }
  )

  if (!startRes.ok) {
    const text = await startRes.text()
    return NextResponse.json({ error: `Apify start failed: ${text}` }, { status: 500 })
  }

  const { data: { id: runId, defaultDatasetId } } = await startRes.json() as { data: { id: string; defaultDatasetId: string } }

  // Poll for completion (max 90 seconds)
  let status = "RUNNING"
  for (let i = 0; i < 18; i++) {
    await new Promise(r => setTimeout(r, 5000))
    const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`)
    const statusData = await statusRes.json() as { data: { status: string } }
    status = statusData.data.status
    if (status === "SUCCEEDED" || status === "FAILED" || status === "ABORTED") break
  }

  if (status !== "SUCCEEDED") {
    return NextResponse.json({ error: `Apify run ${status}`, runId }, { status: 500 })
  }

  // Fetch dataset items
  const itemsRes = await fetch(
    `https://api.apify.com/v2/datasets/${defaultDatasetId}/items?token=${APIFY_TOKEN}&clean=true&limit=200`
  )
  const items = await itemsRes.json() as ApifyPost[]

  // Filter to posts mentioning trades keywords
  const tradePosts = items.filter(item => {
    const text = (item.text ?? item.message ?? "").toLowerCase()
    return TRADES_KEYWORDS.some(kw => text.includes(kw.toLowerCase()))
  })

  const rawLeads = fbPostsToLeads(tradePosts.map(p => ({
    postId: p.postId ?? p.id ?? Math.random().toString(36).slice(2),
    text: p.text ?? p.message ?? "",
    authorName: p.authorName ?? p.author?.name,
    postUrl: p.url ?? p.postUrl,
    groupName: p.groupName,
    timestamp: p.time ?? p.timestamp,
  })))

  // Dedup against existing
  const existing = await getLeads()
  const existingIds = new Set(existing.map(l => l.id))
  const newLeads = rawLeads.filter(l => !existingIds.has(l.id))

  const qualified = await qualifyBatch(newLeads)
  await saveLeads(qualified)

  return NextResponse.json({
    runId,
    totalPosts: items.length,
    tradesPosts: tradePosts.length,
    new: newLeads.length,
    qualified: qualified.filter(l => l.status === "qualified").length,
  })
}
