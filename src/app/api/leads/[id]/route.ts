import { NextRequest, NextResponse } from "next/server"
import { getLead } from "@/lib/storage"

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const lead = await getLead(params.id)
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 })
  // Return teaser only — source URL and raw text are delivered after payment
  return NextResponse.json({
    id: lead.id,
    tradeType: lead.tradeType,
    urgency: lead.urgency,
    location: lead.location,
    locationState: lead.locationState,
    problemSummary: lead.problemSummary,
    estimatedValue: lead.estimatedValue,
    status: lead.status,
  })
}
