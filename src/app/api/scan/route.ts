import { NextRequest, NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { runScan } from "@/lib/scanner"
import type { Campaign, ICP, Lead } from "@/types/navigator"

export async function POST(req: NextRequest) {
  try {
    const { campaign, icp } = await req.json() as { campaign: Campaign; icp: ICP }
    const rawLeads = await runScan(campaign, icp)
    const now = new Date().toISOString()
    const leads: Lead[] = rawLeads.map(l => ({ ...l, id: nanoid(10), discoveredAt: now, updatedAt: now }))
    return NextResponse.json({ leads, count: leads.length })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
