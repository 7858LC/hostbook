import { NextRequest, NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { qualifyLead } from "@/lib/qualify"
import { saveLead } from "@/lib/storage"
import { isAdminRequest } from "@/lib/auth-server"
import { checkDailyCap } from "@/lib/rateLimit"
import type { TradesLead } from "@/types/leads"

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!checkDailyCap("leads-manual", 200)) return NextResponse.json({ error: "Daily limit reached" }, { status: 429 })

  const { text, platform, sourceUrl, authorHandle, location, locationState } =
    await req.json() as {
      text: string
      platform: string
      sourceUrl?: string
      authorHandle?: string
      location?: string
      locationState?: string
    }

  if (!text?.trim()) return NextResponse.json({ error: "Post text is required" }, { status: 400 })

  const now = new Date().toISOString()
  const raw: TradesLead = {
    id: nanoid(10),
    discoveredAt: now,
    platform: (platform as TradesLead["platform"]) ?? "other",
    sourceUrl: sourceUrl?.trim() || "manual",
    rawText: text.trim(),
    authorHandle: authorHandle?.trim() || undefined,
    location: location?.trim() || undefined,
    locationState: locationState?.trim() || undefined,
    tradeType: "unknown",
    urgency: "unknown",
    problemSummary: text.trim().slice(0, 120),
    qualityScore: 0,
    estimatedValue: 75,
    status: "raw",
  }

  const q = await qualifyLead(raw)

  const lead: TradesLead = {
    ...raw,
    tradeType: q.tradeType,
    urgency: q.urgency,
    location: q.location ?? raw.location,
    locationState: q.locationState ?? raw.locationState,
    problemSummary: q.problemSummary,
    qualityScore: q.qualityScore,
    estimatedValue: q.estimatedValue,
    status: q.isRelevant && q.qualityScore >= 7 ? "qualified" : "rejected",
  }

  await saveLead(lead)
  return NextResponse.json({ lead, qualified: lead.status === "qualified" })
}
